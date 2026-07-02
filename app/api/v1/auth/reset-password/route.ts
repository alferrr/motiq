import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const BodySchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = BodySchema.parse(await request.json());

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }
    if (payload.purpose !== "password_reset") {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const [result]: any = await pool.query(
      `UPDATE User SET Password = ? WHERE User_ID = ? AND Company_ID = ?`,
      [hashed, payload.userId, payload.companyId],
    );
    if (result.affectedRows === 0)
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );

    return NextResponse.json({ message: "Password updated. You can now sign in." });
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
