import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginSchema } from "@/schemas/auth.schema";

// Lets the site owner log in with just email + password, skipping the
// company-ID step every tenant login requires — the CMS isn't a tenant
// concern, so there's no company to pick. Only OWNER_EMAIL can use this path;
// everyone else (including tenant Admins) still goes through /signin.
export async function POST(request: NextRequest) {
  try {
    const { email, password } = LoginSchema.parse(await request.json());

    // one generic error for "not the owner" and "wrong password" alike, so
    // this endpoint never reveals which part failed
    const invalidCredentials = () =>
      NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );

    if (!process.env.OWNER_EMAIL || email !== process.env.OWNER_EMAIL) {
      return invalidCredentials();
    }

    const [rows]: any = await pool.query(
      `SELECT u.User_ID, u.FullName, u.Email, u.Password, u.Role, u.Company_ID,
              c.Name AS CompanyName, c.ThemeColor
       FROM User u
       JOIN Company c ON c.Company_ID = u.Company_ID
       WHERE u.Email = ?
       ORDER BY u.CreatedAt ASC
       LIMIT 1`,
      [email],
    );
    if (rows.length === 0) return invalidCredentials();

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.Password);
    if (!passwordMatch) return invalidCredentials();

    const token = jwt.sign(
      {
        id: user.User_ID,
        email: user.Email,
        role: user.Role,
        companyId: user.Company_ID,
        companyName: user.CompanyName,
        themeColor: user.ThemeColor,
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
          companyName: user.CompanyName,
          themeColor: user.ThemeColor,
          isOwner: true,
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
