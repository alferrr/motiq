import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";
import { companyRegisteredEmail } from "@/lib/emailTemplates";

const RegisterSchema = z.object({
  company: z.object({
    garageName: z.string().min(1, "Garage name is required"),
    address: z.string().min(1, "Address is required"),
    contactNumber: z.string().min(1, "Contact number is required"),
    email: z.string().email("Enter a valid email"),
    themeColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
      .default("#2563eb"),
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

    // check duplicate company email
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

    // check duplicate admin email/username
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

    // generate unique company ID: <SLUG>-<8 alphanumeric chars>
    // e.g. MERCADOAUTO-A3F7K2PQ
    const generateCompanyId = (name: string): string => {
      const slug = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10);
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const suffix = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");
      return `${slug}-${suffix}`;
    };

    // ensure uniqueness (retry up to 5 times in the rare collision case)
    let companyId = "";
    for (let i = 0; i < 5; i++) {
      const candidate = generateCompanyId(company.garageName);
      const [clash]: any = await conn.query(
        "SELECT Company_ID FROM Company WHERE Company_ID = ? LIMIT 1",
        [candidate],
      );
      if (clash.length === 0) {
        companyId = candidate;
        break;
      }
    }
    if (!companyId) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Failed to generate a unique Company ID. Please try again." },
        { status: 500 },
      );
    }

    // insert company
    await conn.query(
      `INSERT INTO Company
        (Company_ID, Name, Address, ContactNumber, Email, ThemeColor,
         GarageType, NumberOfBays, OpeningTime, ClosingTime,
         BusinessPermitNumber, DtiSecNumber, YearsInOperation,
         OwnerFullName, OwnerIdType, OwnerIdNumber)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        company.garageName,
        company.address,
        company.contactNumber,
        company.email,
        company.themeColor,
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

    // hash password and insert admin user
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    await conn.query(
      `INSERT INTO User
        (Company_ID, FullName, Username, Email, Password, Role)
       VALUES (?, ?, ?, ?, ?, 'Admin')`,
      [companyId, admin.fullName, admin.username, admin.email, hashedPassword],
    );

    await conn.commit();

    const { subject, html } = companyRegisteredEmail({
      companyName: company.garageName,
      themeColor: company.themeColor,
      companyEmail: company.email,
      companyContact: company.contactNumber,
      companyAddress: company.address,
      adminName: admin.fullName,
      companyId,
    });
    await sendEmail({ to: admin.email, subject, html });

    return NextResponse.json(
      {
        message: "Registration successful",
        companyId,
        themeColor: company.themeColor,
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
