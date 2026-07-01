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

const PartSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  sku: z.string().optional(),
  unitPrice: z.coerce.number({ error: "Unit price is required" }).min(0),
  stockQuantity: z.coerce
    .number({ error: "Stock quantity is required" })
    .min(0),
  minimumStock: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const filter = searchParams.get("filter") ?? "all"; // all | low | out
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 10)));
    const offset = (page - 1) * limit;
    const like = `%${search}%`;

    const stockClause =
      filter === "low"
        ? "AND StockQuantity > 0 AND StockQuantity <= MinimumStock"
        : filter === "out"
          ? "AND StockQuantity = 0"
          : "";

    const [rows]: any = await pool.query(
      `SELECT Part_ID, PartName, SKU, UnitPrice, StockQuantity, MinimumStock
       FROM PartsInventory
       WHERE Company_ID = ?
         ${stockClause}
         AND (PartName LIKE ? OR SKU LIKE ?)
       ORDER BY PartName ASC
       LIMIT ? OFFSET ?`,
      [companyId, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM PartsInventory
       WHERE Company_ID = ?
         ${stockClause}
         AND (PartName LIKE ? OR SKU LIKE ?)`,
      [companyId, like, like],
    );

    const [[{ lowCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS lowCount FROM PartsInventory
       WHERE Company_ID = ? AND StockQuantity > 0 AND StockQuantity <= MinimumStock`,
      [companyId],
    );

    const [[{ outCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS outCount FROM PartsInventory
       WHERE Company_ID = ? AND StockQuantity = 0`,
      [companyId],
    );

    return NextResponse.json({
      parts: rows,
      total,
      page,
      limit,
      lowCount,
      outCount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = PartSchema.parse(await request.json());

    // check duplicate SKU
    if (body.sku) {
      const [[existing]]: any = await pool.query(
        "SELECT Part_ID FROM PartsInventory WHERE Company_ID = ? AND SKU = ? LIMIT 1",
        [companyId, body.sku],
      );
      if (existing)
        return NextResponse.json(
          { error: "A part with this SKU already exists." },
          { status: 409 },
        );
    }

    const [result]: any = await pool.query(
      `INSERT INTO PartsInventory (Company_ID, PartName, SKU, UnitPrice, StockQuantity, MinimumStock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        body.partName,
        body.sku ?? null,
        body.unitPrice,
        body.stockQuantity,
        body.minimumStock,
      ],
    );

    return NextResponse.json({ partId: result.insertId }, { status: 201 });
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
