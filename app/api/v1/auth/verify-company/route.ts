import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";

const BodySchema = z.object({
  companyId: z.string().min(1, { message: "Company ID is required" }),
});

export async function POST(request: NextRequest) {
  try {
    const { companyId } = BodySchema.parse(await request.json());

    const [rows]: any = await pool.query(
      "SELECT Company_ID, Name, ThemeColor FROM Company WHERE Company_ID = ? LIMIT 1",
      [companyId],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Company not found. Check your ID." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { name: rows[0].Name, themeColor: rows[0].ThemeColor },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
