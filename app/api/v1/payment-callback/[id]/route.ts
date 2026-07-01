import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { retrieveKasaPayment, KASA_PROVIDER_LABEL, centavosToPesos } from "@/lib/kasa";
import { recomputeInvoiceStatus } from "@/lib/invoices";

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
    if (!paymentId) return statusPage("error");

    const [[invoice]]: any = await pool.query(
      `SELECT Invoice_ID FROM Invoice WHERE Invoice_ID = ? LIMIT 1`,
      [id],
    );
    if (!invoice) return statusPage("error");

    const payment = await retrieveKasaPayment(paymentId);

    await pool.query(
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

    await recomputeInvoiceStatus(Number(id));

    return statusPage(payment.status);
  } catch (err) {
    console.error(err);
    return statusPage("error");
  }
}
