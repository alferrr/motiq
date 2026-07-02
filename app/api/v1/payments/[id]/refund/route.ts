import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";
import { createKasaRefund, pesosToCentavos } from "@/lib/kasa";
import { recomputeInvoiceStatus } from "@/lib/invoices";

const RefundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z
    .enum(["duplicate", "fraudulent", "requested_by_customer", "other"])
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = RefundSchema.parse(await request.json().catch(() => ({})));

    const [[payment]]: any = await pool.query(
      `SELECT p.Payment_ID, p.Invoice_ID, p.KasaPaymentId, p.Status, p.AmountPaid, p.RefundedAmount
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
    if (!payment.KasaPaymentId || payment.Status !== "succeeded")
      return NextResponse.json(
        { error: "Only succeeded Kasa payments can be refunded" },
        { status: 400 },
      );

    const remaining = Number(payment.AmountPaid) - Number(payment.RefundedAmount);
    const refundAmountPesos = body.amount ?? remaining;
    if (refundAmountPesos > remaining)
      return NextResponse.json(
        { error: "Refund amount exceeds remaining payment amount" },
        { status: 400 },
      );

    await createKasaRefund({
      paymentId: payment.KasaPaymentId,
      amount: body.amount ? pesosToCentavos(body.amount) : undefined,
      reason: body.reason,
    });

    const newRefundedAmount = Number(payment.RefundedAmount) + refundAmountPesos;
    const newStatus =
      newRefundedAmount >= Number(payment.AmountPaid)
        ? "refunded"
        : "partially_refunded";

    await pool.query(
      `UPDATE Payment SET RefundedAmount = ?, Status = ? WHERE Payment_ID = ?`,
      [newRefundedAmount, newStatus, id],
    );

    const result = await recomputeInvoiceStatus(payment.Invoice_ID);

    return NextResponse.json({ status: newStatus, ...result });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 },
      );
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
