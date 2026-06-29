import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { z } from "zod";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

const UpdateSchema = z.object({
  serviceName: z.string().min(1).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  laborRate: z.coerce.number().min(0).optional(),
});

const fieldMap: Record<string, string> = {
  serviceName: "ServiceName",
  category: "Category",
  description: "Description",
  laborRate: "LaborRate",
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = UpdateSchema.parse(await request.json());
    const fields = Object.entries(body).filter(([, v]) => v !== undefined);
    if (!fields.length)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const setClauses = fields.map(([k]) => `${fieldMap[k]} = ?`).join(", ");
    const values = fields.map(([, v]) => v);

    await pool.query(
      `UPDATE ServiceCatalog SET ${setClauses}
       WHERE Service_ID = ? AND Company_ID = ?`,
      [...values, id, companyId],
    );

    return NextResponse.json({ message: "Service updated" });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await pool.query(
      "DELETE FROM ServiceCatalog WHERE Service_ID = ? AND Company_ID = ?",
      [id, companyId],
    );

    return NextResponse.json({ message: "Service deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
