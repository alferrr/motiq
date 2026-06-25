import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT * FROM customer");

    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Database connection failed", details: err.message },
      { status: 500 },
    );
  }
}
