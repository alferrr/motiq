import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { buildKasaCheckoutUrl, pesosToCentavos } from "@/lib/kasa";
import { createPaymentReference } from "@/lib/invoices";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[row]]: any = await pool.query(
      `SELECT i.Invoice_ID, i.TotalAmount, comp.Name AS companyName,
              COALESCE(SUM(CASE WHEN p.Status IN ('succeeded','partially_refunded')
                                 THEN p.AmountPaid - p.RefundedAmount ELSE 0 END), 0) AS paidNet
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       JOIN Company  comp ON comp.Company_ID = c.Company_ID
       LEFT JOIN Payment p ON p.Invoice_ID = i.Invoice_ID
       WHERE i.Invoice_ID = ? AND c.Company_ID = ?
       GROUP BY i.Invoice_ID
       LIMIT 1`,
      [id, companyId],
    );
    if (!row)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const balance = Number(row.TotalAmount) - Number(row.paidNet);
    if (balance <= 0)
      return NextResponse.json(
        { error: "Invoice has no outstanding balance" },
        { status: 400 },
      );

    if (!process.env.KASA_SECRET_KEY || !process.env.KASA_BASE_URL)
      return NextResponse.json(
        { error: "Kasa is not configured (KASA_BASE_URL / KASA_SECRET_KEY)" },
        { status: 500 },
      );

    const reference = await createPaymentReference(Number(id));
    const returnUrl = new URL(
      `/api/v1/payment-callback/${id}`,
      request.nextUrl.origin,
    );
    returnUrl.searchParams.set("ref", reference);

    const url = buildKasaCheckoutUrl({
      amountCentavos: pesosToCentavos(balance),
      description: `Invoice #${id} — ${row.companyName}`,
      returnUrl: returnUrl.toString(),
    });

    return NextResponse.json({ url, balance });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
