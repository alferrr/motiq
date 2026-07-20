import mysql from "mysql2/promise";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { buildKasaCheckoutUrl, getCompanyKasaCredentials, pesosToCentavos } from "@/lib/kasa";
import { sendEmail } from "@/lib/email";
import { invoiceGeneratedEmail } from "@/lib/emailTemplates";

type Executor = typeof pool | mysql.PoolConnection;

// recomputes and persists Invoice.Status from its Payment rows. Pass the
// transaction's conn when called alongside a Payment insert/update in the
// same transaction, so this reads the uncommitted write instead of a stale
// pre-commit snapshot under REPEATABLE READ.
export async function recomputeInvoiceStatus(
  invoiceId: number,
  executor: Executor = pool,
) {
  const [[{ totalAmount, paidNet }]]: any = await executor.query(
    `SELECT i.TotalAmount AS totalAmount,
            COALESCE(SUM(CASE WHEN p.Status IN ('succeeded','partially_refunded')
                               THEN p.AmountPaid - p.RefundedAmount ELSE 0 END), 0) AS paidNet
     FROM Invoice i
     LEFT JOIN Payment p ON p.Invoice_ID = i.Invoice_ID
     WHERE i.Invoice_ID = ?
     GROUP BY i.Invoice_ID`,
    [invoiceId],
  );

  const invoiceStatus =
    Number(totalAmount) === 0 || Number(paidNet) >= Number(totalAmount)
      ? "Paid"
      : Number(paidNet) > 0
        ? "Partially Paid"
        : "Unpaid";

  await executor.query(`UPDATE Invoice SET Status = ? WHERE Invoice_ID = ?`, [
    invoiceStatus,
    invoiceId,
  ]);

  return {
    invoiceStatus,
    paidNet: Number(paidNet),
    totalAmount: Number(totalAmount),
  };
}

// generates and persists an unguessable, per-invoice reference used to bind
// a Kasa checkout session to the invoice it's paying (see
// app/api/v1/payment-callback/[id]/route.ts)
export async function createPaymentReference(
  invoiceId: number,
): Promise<string> {
  const reference = crypto.randomBytes(24).toString("hex");
  await pool.query(`UPDATE Invoice SET PaymentReference = ? WHERE Invoice_ID = ?`, [
    reference,
    invoiceId,
  ]);
  return reference;
}

export type CreateInvoiceResult =
  | { ok: true; invoiceId: number; totalAmount: number }
  | { ok: false; reason: "not_found_or_invoiced" }
  | { ok: false; reason: "not_eligible" };

// Creates an invoice for a job (labor + parts), then emails the customer the
// invoice with a Kasa "Pay Now" link (when Kasa is configured and a balance
// is due). Used both by the manual "Create Invoice" action and by the
// auto-invoice flow that fires when a job is marked Completed.
export async function createInvoiceForJob(
  companyId: string,
  jobId: number,
  origin: string,
): Promise<CreateInvoiceResult> {
  const [[job]]: any = await pool.query(
    `SELECT rj.Job_ID, rj.Status,
            c.FullName AS customerName, c.Email AS customerEmail,
            v.Make, v.Model,
            co.Name AS companyName, co.ThemeColor,
            co.Email AS companyEmail, co.ContactNumber AS companyContact, co.Address AS companyAddress
     FROM RepairJob rj
     JOIN Vehicle  v  ON v.Vehicle_ID  = rj.Vehicle_ID
     JOIN Customer c  ON c.Customer_ID = v.Customer_ID
     JOIN Company  co ON co.Company_ID = c.Company_ID
     LEFT JOIN Invoice i ON i.Job_ID = rj.Job_ID
     WHERE rj.Job_ID = ? AND c.Company_ID = ? AND i.Invoice_ID IS NULL
     LIMIT 1`,
    [jobId, companyId],
  );
  if (!job) return { ok: false, reason: "not_found_or_invoiced" };
  if (!["Completed", "Released"].includes(job.Status))
    return { ok: false, reason: "not_eligible" };

  const [services]: any = await pool.query(
    `SELECT sc.ServiceName, sc.LaborRate
     FROM JobService js
     JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
     WHERE js.Job_ID = ? AND sc.Company_ID = ?`,
    [jobId, companyId],
  );
  const [parts]: any = await pool.query(
    `SELECT pi.PartName, jp.QuantityUsed, pi.UnitPrice
     FROM JobParts jp
     JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
     WHERE jp.Job_ID = ? AND pi.Company_ID = ?`,
    [jobId, companyId],
  );

  const lineItems = [
    ...services.map((s: any) => ({
      label: s.ServiceName,
      amount: Number(s.LaborRate),
    })),
    ...parts.map((p: any) => ({
      label: `${p.PartName} × ${p.QuantityUsed}`,
      amount: Number(p.UnitPrice) * p.QuantityUsed,
    })),
  ];
  const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);

  const [result]: any = await pool.query(
    `INSERT INTO Invoice (Job_ID, DateIssued, TotalAmount, Status)
     VALUES (?, CURDATE(), ?, ?)`,
    [jobId, totalAmount, totalAmount === 0 ? "Paid" : "Unpaid"],
  );
  const invoiceId = result.insertId;

  if (job.customerEmail) {
    let paymentUrl: string | null = null;
    const kasaCreds = totalAmount > 0 ? await getCompanyKasaCredentials(companyId) : null;
    if (kasaCreds) {
      const reference = await createPaymentReference(invoiceId);
      const returnUrl = new URL(
        `/api/v1/payment-callback/${invoiceId}`,
        origin,
      );
      returnUrl.searchParams.set("ref", reference);
      paymentUrl = buildKasaCheckoutUrl({
        amountCentavos: pesosToCentavos(totalAmount),
        description: `Invoice #${invoiceId} — ${job.companyName}`,
        returnUrl: returnUrl.toString(),
        merchantSlug: kasaCreds.merchantSlug,
      });
    }

    const { subject, html } = invoiceGeneratedEmail({
      companyName: job.companyName,
      themeColor: job.ThemeColor,
      companyEmail: job.companyEmail,
      companyContact: job.companyContact,
      companyAddress: job.companyAddress,
      customerName: job.customerName,
      invoiceId,
      vehicle: `${job.Make} ${job.Model}`,
      totalAmount,
      dateIssued: new Date().toISOString().slice(0, 10),
      paymentUrl,
      lineItems,
    });
    await sendEmail({ to: job.customerEmail, subject, html });
  }

  return { ok: true, invoiceId, totalAmount };
}
