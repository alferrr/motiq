import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
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

    const result = await withTransaction(async (conn) => {
      // lock the row for the duration of the transaction so a concurrent
      // refund request can't read a stale RefundedAmount and double-refund
      const [[payment]]: any = await conn.query(
        `SELECT p.Payment_ID, p.Invoice_ID, p.KasaPaymentId, p.Status, p.AmountPaid, p.RefundedAmount
         FROM Payment p
         JOIN Invoice  i  ON i.Invoice_ID = p.Invoice_ID
         JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
         JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
         JOIN Customer c  ON c.Customer_ID = v.Customer_ID
         WHERE p.Payment_ID = ? AND c.Company_ID = ?
         LIMIT 1
         FOR UPDATE`,
        [id, companyId],
      );
      if (!payment)
        return { ok: false, error: "Payment not found", httpStatus: 404 } as const;

      const remaining =
        Number(payment.AmountPaid) - Number(payment.RefundedAmount);
      if (
        !payment.KasaPaymentId ||
        !["succeeded", "partially_refunded"].includes(payment.Status) ||
        remaining <= 0
      )
        return {
          ok: false,
          error: "This payment has no remaining refundable balance",
          httpStatus: 400,
        } as const;

      const refundAmountPesos = body.amount ?? remaining;
      if (refundAmountPesos > remaining)
        return {
          ok: false,
          error: "Refund amount exceeds remaining payment amount",
          httpStatus: 400,
        } as const;

      await createKasaRefund({
        paymentId: payment.KasaPaymentId,
        amount: body.amount ? pesosToCentavos(body.amount) : undefined,
        reason: body.reason,
      });

      const newRefundedAmount =
        Number(payment.RefundedAmount) + refundAmountPesos;
      const newStatus =
        newRefundedAmount >= Number(payment.AmountPaid)
          ? "refunded"
          : "partially_refunded";

      await conn.query(
        `UPDATE Payment SET RefundedAmount = ?, Status = ? WHERE Payment_ID = ?`,
        [newRefundedAmount, newStatus, id],
      );

      const invoiceResult = await recomputeInvoiceStatus(
        payment.Invoice_ID,
        conn,
      );

      return { ok: true, status: newStatus, ...invoiceResult } as const;
    });

    if (!result.ok)
      return NextResponse.json(
        { error: result.error },
        { status: result.httpStatus },
      );

    const { ok: _ok, ...rest } = result;
    return NextResponse.json(rest);
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
