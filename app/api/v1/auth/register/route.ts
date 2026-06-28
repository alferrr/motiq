import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const RegisterSchema = z.object({
  company: z.object({
    garageName: z.string().min(1, "Garage name is required"),
    address: z.string().min(1, "Address is required"),
    contactNumber: z.string().min(1, "Contact number is required"),
    email: z.string().email("Enter a valid email"),
  }),
  garage: z.object({
    garageType: z.string().min(1, "Garage type is required"),
    numberOfBays: z.coerce
      .number({ error: "Number of bays is required" })
      .min(1),
    openingTime: z.string().min(1, "Opening time is required"),
    closingTime: z.string().min(1, "Closing time is required"),
  }),
  business: z.object({
    businessPermitNumber: z
      .string()
      .min(1, "Business permit number is required"),
    dtiSecNumber: z.string().min(1, "DTI/SEC number is required"),
    yearsInOperation: z.coerce
      .number({ error: "Years in operation is required" })
      .min(0),
  }),
  owner: z.object({
    fullName: z.string().min(1, "Owner name is required"),
    idType: z.string().min(1, "ID type is required"),
    idNumber: z.string().min(1, "ID number is required"),
  }),
  admin: z
    .object({
      fullName: z.string().min(1, "Full name is required"),
      username: z.string().min(1, "Username is required"),
      email: z.string().email("Enter a valid email"),
      password: z.string().min(8, "Minimum 8 characters"),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
});

export async function POST(request: NextRequest) {
  const conn = await (pool as any).getConnection();

  try {
    const body = RegisterSchema.parse(await request.json());
    const { company, garage, business, owner, admin } = body;

    await conn.beginTransaction();

    // ── check if company email already exists ───────────────────────────────
    const [existing]: any = await conn.query(
      "SELECT Company_ID FROM Company WHERE Email = ? LIMIT 1",
      [company.email],
    );
    if (existing.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "A company with this email already exists." },
        { status: 409 },
      );
    }

    // ── check if admin email/username already exists ────────────────────────
    const [existingAdmin]: any = await conn.query(
      "SELECT User_ID FROM User WHERE Email = ? OR Username = ? LIMIT 1",
      [admin.email, admin.username],
    );
    if (existingAdmin.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Admin email or username is already taken." },
        { status: 409 },
      );
    }

    // ── insert company ──────────────────────────────────────────────────────
    const [companyResult]: any = await conn.query(
      `INSERT INTO Company
        (Name, Address, ContactNumber, Email,
         GarageType, NumberOfBays, OpeningTime, ClosingTime,
         BusinessPermitNumber, DtiSecNumber, YearsInOperation,
         OwnerFullName, OwnerIdType, OwnerIdNumber)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company.garageName,
        company.address,
        company.contactNumber,
        company.email,
        garage.garageType,
        garage.numberOfBays,
        garage.openingTime,
        garage.closingTime,
        business.businessPermitNumber,
        business.dtiSecNumber,
        business.yearsInOperation,
        owner.fullName,
        owner.idType,
        owner.idNumber,
      ],
    );

    const companyId: number = companyResult.insertId;

    // ── hash password and insert admin user ─────────────────────────────────
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    await conn.query(
      `INSERT INTO User
        (Company_ID, FullName, Username, Email, Password, Role)
       VALUES (?, ?, ?, ?, ?, 'Admin')`,
      [companyId, admin.fullName, admin.username, admin.email, hashedPassword],
    );

    await conn.commit();

    return NextResponse.json(
      {
        message: "Registration successful",
        companyId,
      },
      { status: 201 },
    );
  } catch (err) {
    await conn.rollback();

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 },
      );
    }

    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
