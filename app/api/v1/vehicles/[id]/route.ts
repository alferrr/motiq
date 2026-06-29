import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { z } from "zod";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

const UpdateSchema = z.object({
  plateNumber: z.string().min(1).optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  year: z.coerce.number().min(1900).optional(),
  vin: z.string().optional(),
  color: z.string().optional(),
  mileage: z.coerce.number().min(0).optional(),
});

const fieldMap: Record<string, string> = {
  plateNumber: "PlateNumber",
  make: "Make",
  model: "Model",
  year: "Year",
  vin: "VIN",
  color: "Color",
  mileage: "Mileage",
};

// GET /api/v1/vehicles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[vehicle]]: any = await pool.query(
      `SELECT v.Vehicle_ID, v.PlateNumber, v.Make, v.Model, v.Year,
              v.VIN, v.Color, v.Mileage, v.CreatedAt,
              c.Customer_ID, c.FullName AS ownerName, c.ContactNumber AS ownerContact
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE v.Vehicle_ID = ? AND c.Company_ID = ? LIMIT 1`,
      [id, companyId],
    );
    if (!vehicle)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    const [jobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status, rj.JobDate, rj.ReportedIssue, rj.Diagnosis,
              u.FullName AS mechanic
       FROM RepairJob rj
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User u ON u.User_ID = m.User_ID
       WHERE rj.Vehicle_ID = ?
       ORDER BY rj.JobDate DESC
       LIMIT 10`,
      [id],
    );

    return NextResponse.json({ vehicle, jobs });
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
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = UpdateSchema.parse(await request.json());
    const fields = Object.entries(body).filter(([, v]) => v !== undefined);
    if (!fields.length)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const setClauses = fields.map(([k]) => `${fieldMap[k]} = ?`).join(", ");
    const values = fields.map(([, v]) => v);

    await pool.query(
      `UPDATE Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       SET ${setClauses}
       WHERE v.Vehicle_ID = ? AND c.Company_ID = ?`,
      [...values, id, companyId],
    );

    return NextResponse.json({ message: "Vehicle updated" });
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
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await pool.query(
      `DELETE v FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE v.Vehicle_ID = ? AND c.Company_ID = ?`,
      [id, companyId],
    );

    return NextResponse.json({ message: "Vehicle deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
