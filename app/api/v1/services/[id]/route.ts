import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";

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
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "Mechanic")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = session.companyId;

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
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "Mechanic")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = session.companyId;

    const [[{ usageCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS usageCount FROM JobService js
       JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
       WHERE js.Service_ID = ? AND sc.Company_ID = ?`,
      [id, companyId],
    );
    if (usageCount > 0)
      return NextResponse.json(
        {
          error: `This service is used on ${usageCount} job order${usageCount === 1 ? "" : "s"} and can't be deleted.`,
        },
        { status: 400 },
      );

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
