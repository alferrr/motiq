import { pool } from "@/lib/db";
import { buildKasaCheckoutUrl, pesosToCentavos } from "@/lib/kasa";
import { sendEmail } from "@/lib/email";
import { invoiceGeneratedEmail } from "@/lib/emailTemplates";

// recomputes and persists Invoice.Status from its Payment rows
export async function recomputeInvoiceStatus(invoiceId: number) {
  const [[{ totalAmount, paidNet }]]: any = await pool.query(
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
    Number(paidNet) >= Number(totalAmount) && Number(totalAmount) > 0
      ? "Paid"
      : Number(paidNet) > 0
        ? "Partially Paid"
        : "Unpaid";

  await pool.query(`UPDATE Invoice SET Status = ? WHERE Invoice_ID = ?`, [
    invoiceStatus,
    invoiceId,
  ]);

  return {
    invoiceStatus,
    paidNet: Number(paidNet),
    totalAmount: Number(totalAmount),
  };
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

  const [[{ totalLabor }]]: any = await pool.query(
    `SELECT COALESCE(SUM(sc.LaborRate), 0) AS totalLabor
     FROM JobService js
     JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
     WHERE js.Job_ID = ?`,
    [jobId],
  );
  const [[{ totalParts }]]: any = await pool.query(
    `SELECT COALESCE(SUM(pi.UnitPrice * jp.QuantityUsed), 0) AS totalParts
     FROM JobParts jp
     JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
     WHERE jp.Job_ID = ?`,
    [jobId],
  );
  const totalAmount = Number(totalLabor) + Number(totalParts);

  const [result]: any = await pool.query(
    `INSERT INTO Invoice (Job_ID, DateIssued, TotalAmount, Status)
     VALUES (?, CURDATE(), ?, 'Unpaid')`,
    [jobId, totalAmount],
  );
  const invoiceId = result.insertId;

  if (job.customerEmail) {
    let paymentUrl: string | null = null;
    if (totalAmount > 0 && process.env.KASA_SECRET_KEY && process.env.KASA_BASE_URL) {
      const returnUrl = new URL(
        `/api/v1/payment-callback/${invoiceId}`,
        origin,
      ).toString();
      paymentUrl = buildKasaCheckoutUrl({
        amountCentavos: pesosToCentavos(totalAmount),
        description: `Invoice #${invoiceId} — ${job.companyName}`,
        returnUrl,
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
    });
    await sendEmail({ to: job.customerEmail, subject, html });
  }

  return { ok: true, invoiceId, totalAmount };
}
