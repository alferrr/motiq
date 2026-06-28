import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginSchema } from "@/schemas/auth.schema";

const BodySchema = LoginSchema.extend({
  companyId: z.coerce.number({ error: "Company ID is required" }),
});

export async function POST(request: NextRequest) {
  try {
    const { email, password, companyId } = BodySchema.parse(
      await request.json(),
    );

    const [rows]: any = await pool.query(
      `SELECT User_ID, FullName, Email, Password, Role, Company_ID
       FROM User
       WHERE Email = ? AND Company_ID = ?
       LIMIT 1`,
      [email, companyId],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.Password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = jwt.sign(
      {
        id: user.User_ID,
        email: user.Email,
        role: user.Role,
        companyId: user.Company_ID,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.User_ID,
          fullName: user.FullName,
          email: user.Email,
          role: user.Role,
          companyId: user.Company_ID,
        },
      },
      { status: 200 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
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
  }
}
