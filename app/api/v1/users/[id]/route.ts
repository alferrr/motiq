import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";

const UpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["Admin", "Front Desk", "Mechanic"]).optional(),
  specialization: z.string().optional(),
  contactNumber: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const conn = await (pool as any).getConnection();
  try {
    const { id } = await params;
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = UpdateSchema.parse(await request.json());
    await conn.beginTransaction();

    const fieldMap: Record<string, string> = {
      fullName: "FullName",
      username: "Username",
      email: "Email",
      role: "Role",
    };

    const coreFields = Object.entries(body).filter(
      ([k, v]) =>
        v !== undefined &&
        ["fullName", "username", "email", "role"].includes(k),
    );

    if (body.password) {
      const hashed = await bcrypt.hash(body.password, 10);
      coreFields.push(["password", hashed]);
      fieldMap["password"] = "Password";
    }

    if (coreFields.length) {
      const setClauses = coreFields
        .map(([k]) => `${fieldMap[k]} = ?`)
        .join(", ");
      const values = coreFields.map(([, v]) => v);
      await conn.query(
        `UPDATE User SET ${setClauses} WHERE User_ID = ? AND Company_ID = ?`,
        [...values, id, auth.companyId],
      );
    }

    if (
      body.role === "Mechanic" ||
      body.specialization !== undefined ||
      body.contactNumber !== undefined
    ) {
      const [[mechanic]]: any = await conn.query(
        "SELECT Mechanic_ID FROM Mechanic WHERE User_ID = ? LIMIT 1",
        [id],
      );
      if (mechanic) {
        const updates: string[] = [];
        const vals: any[] = [];
        if (body.specialization !== undefined) {
          updates.push("Specialization = ?");
          vals.push(body.specialization);
        }
        if (body.contactNumber !== undefined) {
          updates.push("ContactNumber = ?");
          vals.push(body.contactNumber);
        }
        if (updates.length)
          await conn.query(
            `UPDATE Mechanic SET ${updates.join(", ")} WHERE User_ID = ?`,
            [...vals, id],
          );
      } else if (body.role === "Mechanic") {
        await conn.query(
          "INSERT INTO Mechanic (User_ID, Specialization, ContactNumber) VALUES (?, ?, ?)",
          [id, body.specialization ?? null, body.contactNumber ?? null],
        );
      }
    }

    await conn.commit();
    return NextResponse.json({ message: "User updated" });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (String(id) === String(auth.id))
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 },
      );

    await pool.query("DELETE FROM User WHERE User_ID = ? AND Company_ID = ?", [
      id,
      auth.companyId,
    ]);
    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
