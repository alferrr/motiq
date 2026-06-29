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
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
