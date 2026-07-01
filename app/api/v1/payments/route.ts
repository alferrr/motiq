import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

export async function GET(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const method = searchParams.get("method") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 10;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;

    const filters: string[] = [];
    const filterParams: string[] = [];
    if (status) {
      filters.push("p.Status = ?");
      filterParams.push(status);
    }
    if (method) {
      filters.push("p.PaymentMethod = ?");
      filterParams.push(method);
    }
    const filterClause = filters.length ? `AND ${filters.join(" AND ")}` : "";

    const [rows]: any = await pool.query(
      `SELECT
         p.Payment_ID, p.Invoice_ID, p.PaymentMethod, p.AmountPaid, p.PaymentDate,
         p.ReferenceNumber, p.KasaPaymentId, p.Status, p.RefundedAmount,
         c.FullName AS customerName,
         v.Make, v.Model, v.PlateNumber
       FROM Payment p
       JOIN Invoice  i  ON i.Invoice_ID = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         ${filterClause}
         AND (c.FullName LIKE ? OR v.PlateNumber LIKE ? OR p.ReferenceNumber LIKE ?)
       ORDER BY p.PaymentDate DESC, p.Payment_ID DESC
       LIMIT ? OFFSET ?`,
      [companyId, ...filterParams, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Payment p
       JOIN Invoice  i  ON i.Invoice_ID = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         ${filterClause}
         AND (c.FullName LIKE ? OR v.PlateNumber LIKE ? OR p.ReferenceNumber LIKE ?)`,
      [companyId, ...filterParams, like, like, like],
    );

    return NextResponse.json({ payments: rows, total, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
