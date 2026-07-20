import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";

const UpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  contactNumber: z.string().min(1).optional(),
  email: z.string().min(1, "Email is required").email("Enter a valid email").optional(),
  address: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[customer]]: any = await pool.query(
      `SELECT Customer_ID, FullName, ContactNumber, Email, Address, CreatedAt
       FROM Customer WHERE Customer_ID = ? AND Company_ID = ? LIMIT 1`,
      [id, companyId],
    );
    if (!customer)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );

    const [vehicles]: any = await pool.query(
      `SELECT Vehicle_ID, PlateNumber, Make, Model, Year, Color, Mileage
       FROM Vehicle WHERE Customer_ID = ? ORDER BY CreatedAt DESC`,
      [id],
    );

    const [jobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status, rj.JobDate, rj.ReportedIssue,
              v.Make, v.Model, v.PlateNumber,
              u.FullName AS mechanic
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User     u ON u.User_ID     = m.User_ID
       WHERE v.Customer_ID = ?
       ORDER BY rj.JobDate DESC`,
      [id],
    );

    return NextResponse.json({ customer, vehicles, jobs });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = UpdateSchema.parse(await request.json());

    const fieldMap: Record<string, string> = {
      fullName: "FullName",
      contactNumber: "ContactNumber",
      email: "Email",
      address: "Address",
    };

    const fields = Object.entries(body).filter(([, v]) => v !== undefined);
    if (!fields.length)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const setClauses = fields.map(([k]) => `${fieldMap[k]} = ?`).join(", ");
    const values = fields.map(([, v]) => v);

    await pool.query(
      `UPDATE Customer SET ${setClauses} WHERE Customer_ID = ? AND Company_ID = ?`,
      [...values, id, companyId],
    );

    return NextResponse.json({ message: "Customer updated" });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await pool.query(
      "DELETE FROM Customer WHERE Customer_ID = ? AND Company_ID = ?",
      [id, companyId],
    );

    return NextResponse.json({ message: "Customer deleted" });
  } catch (err: any) {
    if (err?.code === "ER_ROW_IS_REFERENCED_2" || err?.errno === 1451)
      return NextResponse.json(
        {
          error:
            "This customer has paid invoices on record and can't be deleted.",
        },
        { status: 400 },
      );
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
