import { NextRequest, NextResponse } from "next/server";
import { pool, withTransaction } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { retrieveKasaPayment } from "@/lib/kasa";
import { recomputeInvoiceStatus } from "@/lib/invoices";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emailTemplates";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[payment]]: any = await pool.query(
      `SELECT p.Payment_ID, p.Invoice_ID, p.KasaPaymentId, p.Status, p.AmountPaid, p.PaymentMethod
       FROM Payment p
       JOIN Invoice  i  ON i.Invoice_ID = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE p.Payment_ID = ? AND c.Company_ID = ?
       LIMIT 1`,
      [id, companyId],
    );
    if (!payment)
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (!payment.KasaPaymentId)
      return NextResponse.json(
        { error: "Only Kasa-sourced payments can be refreshed" },
        { status: 400 },
      );

    const wasAlreadySucceeded = payment.Status === "succeeded";
    const kasaPayment = await retrieveKasaPayment(payment.KasaPaymentId);

    const result = await withTransaction(async (conn) => {
      await conn.query(`UPDATE Payment SET Status = ? WHERE Payment_ID = ?`, [
        kasaPayment.status,
        id,
      ]);
      return recomputeInvoiceStatus(payment.Invoice_ID, conn);
    });

    // some Kasa methods only confirm on manual refresh rather than the
    // customer's return-trip callback, so this is a genuine first-success
    // path — send the receipt exactly once, same guard as the callback route
    if (kasaPayment.status === "succeeded" && !wasAlreadySucceeded) {
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
        [payment.Invoice_ID],
      );
      if (recipient?.customerEmail) {
        const { subject, html } = paymentReceiptEmail({
          companyName: recipient.companyName,
          themeColor: recipient.ThemeColor,
          companyEmail: recipient.companyEmail,
          companyContact: recipient.companyContact,
          companyAddress: recipient.companyAddress,
          customerName: recipient.customerName,
          invoiceId: payment.Invoice_ID,
          amountPaid: Number(payment.AmountPaid),
          method: payment.PaymentMethod,
          balance: Math.max(0, result.totalAmount - result.paidNet),
          invoiceStatus: result.invoiceStatus,
        });
        await sendEmail({ to: recipient.customerEmail, subject, html });
      }
    }

    return NextResponse.json({ status: kasaPayment.status, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
