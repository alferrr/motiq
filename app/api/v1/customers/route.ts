import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";

const CustomerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  address: z.string().optional(),
});

// search + pagination;
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 10;
    const offset = (page - 1) * limit;

    const like = `%${search}%`;

    const [rows]: any = await pool.query(
      `SELECT c.Customer_ID, c.FullName, c.ContactNumber, c.Address, c.CreatedAt,
              COUNT(v.Vehicle_ID) AS vehicleCount
       FROM Customer c
       LEFT JOIN Vehicle v ON v.Customer_ID = c.Customer_ID
       WHERE c.Company_ID = ?
         AND (c.FullName LIKE ? OR c.ContactNumber LIKE ? OR c.Address LIKE ?)
       GROUP BY c.Customer_ID
       ORDER BY c.CreatedAt DESC
       LIMIT ? OFFSET ?`,
      [companyId, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM Customer
       WHERE Company_ID = ?
         AND (FullName LIKE ? OR ContactNumber LIKE ? OR Address LIKE ?)`,
      [companyId, like, like, like],
    );

    return NextResponse.json({ customers: rows, total, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// add
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = CustomerSchema.parse(await request.json());

    const [result]: any = await pool.query(
      `INSERT INTO Customer (Company_ID, FullName, ContactNumber, Address)
       VALUES (?, ?, ?, ?)`,
      [companyId, body.fullName, body.contactNumber, body.address ?? null],
    );

    return NextResponse.json({ customerId: result.insertId }, { status: 201 });
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
