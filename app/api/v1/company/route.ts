import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1, "Garage name is required").optional(),
  email: z.string().email("Enter a valid email").optional(),
  contactNumber: z.string().min(1, "Contact number is required").optional(),
  address: z.string().min(1, "Address is required").optional(),
  garageType: z.string().optional(),
  numberOfBays: z.coerce.number().min(1).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[company]]: any = await pool.query(
      `SELECT Company_ID, Name, Address, ContactNumber, Email, GarageType,
              NumberOfBays, OpeningTime, ClosingTime, BusinessPermitNumber,
              DtiSecNumber, YearsInOperation, OwnerFullName, OwnerIdType,
              OwnerIdNumber, ThemeColor, CreatedAt
       FROM Company WHERE Company_ID = ? LIMIT 1`,
      [auth.companyId],
    );
    if (!company)
      return NextResponse.json({ error: "Company not found" }, { status: 404 });

    return NextResponse.json({ company });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = UpdateSchema.parse(await request.json());

    const fieldMap: Record<string, string> = {
      name: "Name",
      email: "Email",
      contactNumber: "ContactNumber",
      address: "Address",
      garageType: "GarageType",
      numberOfBays: "NumberOfBays",
      openingTime: "OpeningTime",
      closingTime: "ClosingTime",
      themeColor: "ThemeColor",
    };
    const fields = Object.entries(body).filter(([, v]) => v !== undefined);
    if (!fields.length)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const setClauses = fields.map(([k]) => `${fieldMap[k]} = ?`).join(", ");
    const values = fields.map(([, v]) => v);

    await pool.query(
      `UPDATE Company SET ${setClauses} WHERE Company_ID = ?`,
      [...values, auth.companyId],
    );

    return NextResponse.json({ message: "Company updated" });
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
