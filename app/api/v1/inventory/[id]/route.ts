import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";

const UpdateSchema = z.object({
  partName: z.string().min(1).optional(),
  sku: z.string().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  stockQuantity: z.coerce.number().min(0).optional(),
  minimumStock: z.coerce.number().min(0).optional(),
  adjustBy: z.coerce.number().optional(), // +/- stock adjustment
});

const fieldMap: Record<string, string> = {
  partName: "PartName",
  sku: "SKU",
  unitPrice: "UnitPrice",
  stockQuantity: "StockQuantity",
  minimumStock: "MinimumStock",
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
    const { adjustBy, ...rest } = body;

    // stock adjustment
    if (adjustBy !== undefined) {
      await pool.query(
        `UPDATE PartsInventory
         SET StockQuantity = GREATEST(0, StockQuantity + ?)
         WHERE Part_ID = ? AND Company_ID = ?`,
        [adjustBy, id, companyId],
      );
      return NextResponse.json({ message: "Stock adjusted" });
    }

    const fields = Object.entries(rest).filter(([, v]) => v !== undefined);
    if (!fields.length)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    if (rest.sku) {
      const [[existing]]: any = await pool.query(
        "SELECT Part_ID FROM PartsInventory WHERE Company_ID = ? AND SKU = ? AND Part_ID != ? LIMIT 1",
        [companyId, rest.sku, id],
      );
      if (existing)
        return NextResponse.json(
          { error: "A part with this SKU already exists." },
          { status: 409 },
        );
    }

    const setClauses = fields.map(([k]) => `${fieldMap[k]} = ?`).join(", ");
    const values = fields.map(([, v]) => v);

    await pool.query(
      `UPDATE PartsInventory SET ${setClauses} WHERE Part_ID = ? AND Company_ID = ?`,
      [...values, id, companyId],
    );

    return NextResponse.json({ message: "Part updated" });
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
      `SELECT COUNT(*) AS usageCount FROM JobParts jp
       JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
       WHERE jp.Part_ID = ? AND pi.Company_ID = ?`,
      [id, companyId],
    );
    if (usageCount > 0)
      return NextResponse.json(
        {
          error: `This part is used on ${usageCount} job order${usageCount === 1 ? "" : "s"} and can't be deleted.`,
        },
        { status: 400 },
      );

    await pool.query(
      "DELETE FROM PartsInventory WHERE Part_ID = ? AND Company_ID = ?",
      [id, companyId],
    );
    return NextResponse.json({ message: "Part deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
