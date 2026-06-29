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

const ServiceSchema = z.object({
  serviceName: z.string().min(1, "Service name is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  laborRate: z.coerce.number({ error: "Labor rate is required" }).min(0),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 10;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;

    const [rows]: any = await pool.query(
      `SELECT s.Service_ID, s.ServiceName, s.Category, s.Description, s.LaborRate,
              COUNT(js.Job_ID) AS usageCount
       FROM ServiceCatalog s
       LEFT JOIN JobService js ON js.Service_ID = s.Service_ID
       WHERE s.Company_ID = ?
         AND (s.ServiceName LIKE ? OR s.Category LIKE ? OR s.Description LIKE ?)
       GROUP BY s.Service_ID
       ORDER BY s.ServiceName ASC
       LIMIT ? OFFSET ?`,
      [companyId, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total FROM ServiceCatalog
       WHERE Company_ID = ?
         AND (ServiceName LIKE ? OR Category LIKE ? OR Description LIKE ?)`,
      [companyId, like, like, like],
    );

    // distinct categories for filter
    const [categories]: any = await pool.query(
      `SELECT DISTINCT Category FROM ServiceCatalog
       WHERE Company_ID = ? AND Category IS NOT NULL AND Category != ''
       ORDER BY Category ASC`,
      [companyId],
    );

    return NextResponse.json({
      services: rows,
      total,
      page,
      limit,
      categories: categories.map((c: any) => c.Category),
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

    const body = ServiceSchema.parse(await request.json());

    const [result]: any = await pool.query(
      `INSERT INTO ServiceCatalog (Company_ID, ServiceName, Category, Description, LaborRate)
       VALUES (?, ?, ?, ?, ?)`,
      [
        companyId,
        body.serviceName,
        body.category ?? null,
        body.description ?? null,
        body.laborRate,
      ],
    );

    return NextResponse.json({ serviceId: result.insertId }, { status: 201 });
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
