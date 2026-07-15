import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginSchema } from "@/schemas/auth.schema";

const BodySchema = LoginSchema.extend({
  companyId: z.string().min(1, "Company ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const { email, password, companyId } = BodySchema.parse(
      await request.json(),
    );

    // verify company exists and grab theme color
    const [companies]: any = await pool.query(
      "SELECT Company_ID, Name, ThemeColor FROM Company WHERE Company_ID = ? LIMIT 1",
      [companyId],
    );
    if (companies.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { Name: companyNameVal, ThemeColor } = companies[0];

    // resolve brand-logo match: does the company name contain a known car brand?
    const [brandRows]: any = await pool.query(
      `SELECT LogoSlug FROM CarBrand
       WHERE ? LIKE CONCAT('%', Name, '%')
       ORDER BY LENGTH(Name) DESC
       LIMIT 1`,
      [companyNameVal],
    );
    const logoSlug: string | null =
      brandRows.length > 0 ? brandRows[0].LogoSlug : null;

    // find user scoped to company
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
        companyName: companyNameVal,
        themeColor: ThemeColor,
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
          companyName: companyNameVal,
          themeColor: ThemeColor,
          logoSlug,
          isOwner: user.Email === process.env.OWNER_EMAIL,
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
