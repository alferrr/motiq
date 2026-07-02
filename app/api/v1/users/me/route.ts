import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

const UpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[user]]: any = await pool.query(
      `SELECT User_ID, FullName, Username, Email, Role, CreatedAt
       FROM User WHERE User_ID = ? LIMIT 1`,
      [auth.id],
    );
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
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

    const body = UpdateSchema.parse(await request.json());

    const fieldMap: Record<string, string> = {
      fullName: "FullName",
      email: "Email",
    };
    const fields = Object.entries(body).filter(
      ([k, v]) => v !== undefined && ["fullName", "email"].includes(k),
    );

    if (body.newPassword) {
      if (!body.currentPassword)
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 },
        );
      const [[row]]: any = await pool.query(
        `SELECT Password FROM User WHERE User_ID = ? LIMIT 1`,
        [auth.id],
      );
      const matches = await bcrypt.compare(body.currentPassword, row.Password);
      if (!matches)
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      const hashed = await bcrypt.hash(body.newPassword, 10);
      fields.push(["password", hashed]);
      fieldMap["password"] = "Password";
    }

    if (!fields.length)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const setClauses = fields.map(([k]) => `${fieldMap[k]} = ?`).join(", ");
    const values = fields.map(([, v]) => v);

    await pool.query(`UPDATE User SET ${setClauses} WHERE User_ID = ?`, [
      ...values,
      auth.id,
    ]);

    return NextResponse.json({ message: "Profile updated" });
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
