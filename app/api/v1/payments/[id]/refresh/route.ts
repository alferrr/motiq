import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { retrieveKasaPayment } from "@/lib/kasa";
import { recomputeInvoiceStatus } from "@/lib/invoices";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[payment]]: any = await pool.query(
      `SELECT p.Payment_ID, p.Invoice_ID, p.KasaPaymentId
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

    const kasaPayment = await retrieveKasaPayment(payment.KasaPaymentId);

    await pool.query(`UPDATE Payment SET Status = ? WHERE Payment_ID = ?`, [
      kasaPayment.status,
      id,
    ]);

    const result = await recomputeInvoiceStatus(payment.Invoice_ID);

    return NextResponse.json({ status: kasaPayment.status, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
