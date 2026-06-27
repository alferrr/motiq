import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const RegisterSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  lastName: z.string().trim().min(2, "Last name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = RegisterSchema.parse(await request.json());

    const { firstName, lastName, email, password } = body;

    const [existing]: any = await pool.query(
      "SELECT * FROM customer WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "Email Already Exists",
        },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    await pool.query(
      "INSERT INTO customer (first_name, last_name, email, password) VALUES (? , ? , ? , ?)",
      [firstName, lastName, email, hashed],
    );

    return NextResponse.json(
      {
        message: "Account Created Succesfully",
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: err.issues[0].message,
        },
        { status: 400 },
      );
    }

    console.error(err);

    return NextResponse.json({ err: "Internal Server Error" }, { status: 500 });
  }
}
