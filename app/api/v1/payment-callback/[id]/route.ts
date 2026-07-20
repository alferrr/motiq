import { NextRequest, NextResponse } from "next/server";
import { pool, withTransaction } from "@/lib/db";
import { retrieveKasaPayment, getCompanyKasaCredentials, KASA_PROVIDER_LABEL, centavosToPesos } from "@/lib/kasa";
import { recomputeInvoiceStatus } from "@/lib/invoices";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emailTemplates";

// Public route — hit by the customer's browser after Kasa checkout, not an
// authenticated Motiq session. The `status` query param from Kasa is untrusted;
// the real status is always fetched server-side below.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const origin = request.nextUrl.origin;
  const statusPage = (status: string) =>
    NextResponse.redirect(new URL(`/pay-status?status=${status}`, origin), 303);

  try {
    const paymentId = request.nextUrl.searchParams.get("payment_id");
    const ref = request.nextUrl.searchParams.get("ref");
    if (!paymentId || !ref) return statusPage("error");

    // verify this callback's `ref` actually belongs to this invoice before
    // ever contacting Kasa — otherwise any valid payment_id (including an
    // unrelated customer's own payment) could be replayed against any
    // invoice URL to mark it paid
    const [[invoice]]: any = await pool.query(
      `SELECT i.Invoice_ID, i.PaymentReference, c.Company_ID
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE i.Invoice_ID = ? LIMIT 1`,
      [id],
    );
    if (!invoice || !invoice.PaymentReference || invoice.PaymentReference !== ref)
      return statusPage("error");

    const kasaCreds = await getCompanyKasaCredentials(invoice.Company_ID);
    if (!kasaCreds) return statusPage("error");

    const payment = await retrieveKasaPayment(kasaCreds.apiKey, paymentId);

    let wasAlreadySucceeded = false;
    let result!: Awaited<ReturnType<typeof recomputeInvoiceStatus>>;
    await withTransaction(async (conn) => {
      // read prior status before upserting so we only email once, the
      // moment the payment first becomes 'succeeded' (not on every
      // return-page hit)
      const [[existing]]: any = await conn.query(
        `SELECT Status FROM Payment WHERE KasaPaymentId = ? LIMIT 1`,
        [payment.id],
      );
      wasAlreadySucceeded = existing?.Status === "succeeded";

      await conn.query(
        `INSERT INTO Payment (Invoice_ID, PaymentMethod, AmountPaid, PaymentDate, ReferenceNumber, KasaPaymentId, Status)
         VALUES (?, ?, ?, CURDATE(), ?, ?, ?)
         ON DUPLICATE KEY UPDATE Status = VALUES(Status), AmountPaid = VALUES(AmountPaid)`,
        [
          id,
          KASA_PROVIDER_LABEL[payment.provider],
          centavosToPesos(payment.amount),
          payment.id,
          payment.id,
          payment.status,
        ],
      );

      result = await recomputeInvoiceStatus(Number(id), conn);
    });

    if (payment.status === "succeeded" && !wasAlreadySucceeded) {
      const [[recipient]]: any = await pool.query(
        `SELECT c.FullName AS customerName, c.Email AS customerEmail,
                co.Name AS companyName, co.ThemeColor,
                co.Email AS companyEmail, co.ContactNumber AS companyContact, co.Address AS companyAddress
         FROM Invoice i
         JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
         JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
         JOIN Customer c  ON c.Customer_ID = v.Customer_ID
         JOIN Company  co ON co.Company_ID = c.Company_ID
         WHERE i.Invoice_ID = ?
         LIMIT 1`,
        [id],
      );
      if (recipient?.customerEmail) {
        const { subject, html } = paymentReceiptEmail({
          companyName: recipient.companyName,
          themeColor: recipient.ThemeColor,
          companyEmail: recipient.companyEmail,
          companyContact: recipient.companyContact,
          companyAddress: recipient.companyAddress,
          customerName: recipient.customerName,
          invoiceId: Number(id),
          amountPaid: centavosToPesos(payment.amount),
          method: KASA_PROVIDER_LABEL[payment.provider],
          balance: Math.max(0, result.totalAmount - result.paidNet),
          invoiceStatus: result.invoiceStatus,
        });
        await sendEmail({ to: recipient.customerEmail, subject, html });
      }
    }

    return statusPage(payment.status);
  } catch (err) {
    console.error(err);
    return statusPage("error");
  }
}
