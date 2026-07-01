import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { z } from "zod";
import bcrypt from "bcryptjs";

function getAuth(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  return jwt.verify(token, process.env.JWT_SECRET!) as any;
}

const UserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  role: z.enum(["Admin", "Front Desk", "Mechanic"]),
  specialization: z.string().optional(),
  contactNumber: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = getAuth(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 10;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;

    const roleClause = role ? `AND u.Role = ?` : "";
    const roleParam = role ? [role] : [];

    const [rows]: any = await pool.query(
      `SELECT
         u.User_ID, u.FullName, u.Username, u.Email, u.Role, u.CreatedAt,
         m.Mechanic_ID, m.Specialization, m.ContactNumber AS mechanicContact
       FROM User u
       LEFT JOIN Mechanic m ON m.User_ID = u.User_ID
       WHERE u.Company_ID = ?
         ${roleClause}
         AND (u.FullName LIKE ? OR u.Username LIKE ? OR u.Email LIKE ?)
       ORDER BY u.CreatedAt DESC
       LIMIT ? OFFSET ?`,
      [auth.companyId, ...roleParam, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM User u
       WHERE u.Company_ID = ?
         ${roleClause}
         AND (u.FullName LIKE ? OR u.Username LIKE ? OR u.Email LIKE ?)`,
      [auth.companyId, ...roleParam, like, like, like],
    );

    // per-role totals, independent of the role filter so the filter chips
    // don't collapse to 0 once a role is selected
    const [roleRows]: any = await pool.query(
      `SELECT Role, COUNT(*) AS count FROM User WHERE Company_ID = ? GROUP BY Role`,
      [auth.companyId],
    );
    const roleCounts: Record<string, number> = {};
    for (const r of roleRows) roleCounts[r.Role] = r.count;

    return NextResponse.json({ users: rows, total, page, limit, roleCounts });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const conn = await (pool as any).getConnection();
  try {
    const auth = getAuth(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = UserSchema.parse(await request.json());

    const [[existing]]: any = await conn.query(
      "SELECT User_ID FROM User WHERE (Email = ? OR Username = ?) AND Company_ID = ? LIMIT 1",
      [body.email, body.username, auth.companyId],
    );
    if (existing)
      return NextResponse.json(
        { error: "Email or username already taken." },
        { status: 409 },
      );

    await conn.beginTransaction();

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const [result]: any = await conn.query(
      `INSERT INTO User (Company_ID, FullName, Username, Email, Password, Role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        auth.companyId,
        body.fullName,
        body.username,
        body.email,
        hashedPassword,
        body.role,
      ],
    );

    const userId = result.insertId;

    if (body.role === "Mechanic") {
      await conn.query(
        `INSERT INTO Mechanic (User_ID, Specialization, ContactNumber)
         VALUES (?, ?, ?)`,
        [userId, body.specialization ?? null, body.contactNumber ?? null],
      );
    }

    await conn.commit();
    return NextResponse.json({ userId }, { status: 201 });
  } catch (err) {
    await conn.rollback();
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
  } finally {
    conn.release();
  }
}
