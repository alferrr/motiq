import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[invoice]]: any = await pool.query(
      `SELECT
         i.Invoice_ID, i.DateIssued, i.TotalAmount, i.Status,
         rj.Job_ID, rj.Status AS jobStatus, rj.ReportedIssue,
         c.Customer_ID, c.FullName AS customerName, c.ContactNumber AS customerContact,
         v.Make, v.Model, v.Year, v.PlateNumber
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE i.Invoice_ID = ? AND c.Company_ID = ?
       LIMIT 1`,
      [id, companyId],
    );
    if (!invoice)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const [services]: any = await pool.query(
      `SELECT sc.Service_ID, sc.ServiceName, sc.Category, sc.LaborRate
       FROM JobService js
       JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
       WHERE js.Job_ID = ?`,
      [invoice.Job_ID],
    );
    const [parts]: any = await pool.query(
      `SELECT jp.Part_ID, jp.QuantityUsed, pi.PartName, pi.SKU, pi.UnitPrice
       FROM JobParts jp
       JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
       WHERE jp.Job_ID = ?`,
      [invoice.Job_ID],
    );
    const [payments]: any = await pool.query(
      `SELECT Payment_ID, PaymentMethod, AmountPaid, PaymentDate, ReferenceNumber,
              KasaPaymentId, Status, RefundedAmount
       FROM Payment
       WHERE Invoice_ID = ?
       ORDER BY PaymentDate DESC, Payment_ID DESC`,
      [id],
    );

    const paidNet = payments.reduce((sum: number, p: any) => {
      if (["succeeded", "partially_refunded"].includes(p.Status)) {
        return sum + (Number(p.AmountPaid) - Number(p.RefundedAmount));
      }
      return sum;
    }, 0);

    return NextResponse.json({
      invoice,
      services,
      parts,
      payments,
      paidNet,
      balance: Number(invoice.TotalAmount) - paidNet,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[invoice]]: any = await pool.query(
      `SELECT i.Invoice_ID, i.Status
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE i.Invoice_ID = ? AND c.Company_ID = ?
       LIMIT 1`,
      [id, companyId],
    );
    if (!invoice)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const [[{ paymentCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS paymentCount FROM Payment WHERE Invoice_ID = ?`,
      [id],
    );
    if (invoice.Status !== "Unpaid" || paymentCount > 0)
      return NextResponse.json(
        { error: "Only unpaid invoices with no payments can be deleted" },
        { status: 400 },
      );

    await pool.query(`DELETE FROM Invoice WHERE Invoice_ID = ?`, [id]);
    return NextResponse.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
