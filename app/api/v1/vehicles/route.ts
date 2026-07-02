import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";

const VehicleSchema = z.object({
  customerId: z.coerce.number({ error: "Customer is required" }),
  plateNumber: z.string().min(1, "Plate number is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  vin: z.string().optional(),
  color: z.string().optional(),
  mileage: z.coerce.number().min(0).optional(),
});

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
      `SELECT v.Vehicle_ID, v.PlateNumber, v.Make, v.Model, v.Year,
              v.Color, v.Mileage, v.CreatedAt,
              c.Customer_ID, c.FullName AS ownerName, c.ContactNumber AS ownerContact,
              COUNT(rj.Job_ID) AS jobCount
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       LEFT JOIN RepairJob rj ON rj.Vehicle_ID = v.Vehicle_ID
       WHERE c.Company_ID = ?
         AND (v.PlateNumber LIKE ? OR v.Make LIKE ? OR v.Model LIKE ?
              OR c.FullName LIKE ? OR v.Color LIKE ?)
       GROUP BY v.Vehicle_ID
       ORDER BY v.CreatedAt DESC
       LIMIT ? OFFSET ?`,
      [companyId, like, like, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         AND (v.PlateNumber LIKE ? OR v.Make LIKE ? OR v.Model LIKE ?
              OR c.FullName LIKE ? OR v.Color LIKE ?)`,
      [companyId, like, like, like, like, like],
    );

    // fetch all customers for the add/edit dropdown
    const [customers]: any = await pool.query(
      `SELECT Customer_ID, FullName FROM Customer WHERE Company_ID = ? ORDER BY FullName ASC`,
      [companyId],
    );

    return NextResponse.json({ vehicles: rows, total, page, limit, customers });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = VehicleSchema.parse(await request.json());

    // verify the customer belongs to this company
    const [[customer]]: any = await pool.query(
      "SELECT Customer_ID FROM Customer WHERE Customer_ID = ? AND Company_ID = ? LIMIT 1",
      [body.customerId, companyId],
    );
    if (!customer)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );

    const [result]: any = await pool.query(
      `INSERT INTO Vehicle (Customer_ID, PlateNumber, Make, Model, Year, VIN, Color, Mileage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.customerId,
        body.plateNumber,
        body.make,
        body.model,
        body.year ?? null,
        body.vin ?? null,
        body.color ?? null,
        body.mileage ?? null,
      ],
    );

    return NextResponse.json({ vehicleId: result.insertId }, { status: 201 });
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
