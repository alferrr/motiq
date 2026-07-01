import { pool } from "@/lib/db";

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
