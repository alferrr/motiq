import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { connectCompanyKasaAccount } from "@/lib/kasa";

const ConnectSchema = z.object({
  secretKey: z
    .string()
    .trim()
    .regex(/^sk_(live|sandbox)_/, "Enter a valid Kasa secret key (sk_live_... or sk_sandbox_...)"),
});

function maskKey(env: string | null): string {
  return env === "live" ? "sk_live_••••" : "sk_sandbox_••••";
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[company]]: any = await pool.query(
      `SELECT KasaSecretKey, KasaMerchantSlug, KasaMerchantName, KasaEnvironment, KasaConnectedAt
       FROM Company WHERE Company_ID = ? LIMIT 1`,
      [auth.companyId],
    );
    if (!company)
      return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const connected = !!company.KasaSecretKey;
    return NextResponse.json({
      connected,
      merchantSlug: company.KasaMerchantSlug,
      merchantName: company.KasaMerchantName,
      environment: company.KasaEnvironment,
      connectedAt: company.KasaConnectedAt,
      maskedKey: connected ? maskKey(company.KasaEnvironment) : null,
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
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = ConnectSchema.parse(await request.json());

    const result = await connectCompanyKasaAccount(auth.companyId, body.secretKey);
    if (!result.ok) {
      if (result.reason === "invalid_key")
        return NextResponse.json(
          { error: "Invalid Kasa secret key" },
          { status: 400 },
        );
      return NextResponse.json(
        { error: "Could not reach Kasa — check KASA_BASE_URL and try again" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: "Kasa account connected",
      merchantSlug: result.merchant.slug,
      merchantName: result.merchant.name,
      environment: result.merchant.environment,
    });
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

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await pool.query(
      `UPDATE Company
       SET KasaSecretKey = NULL, KasaMerchantSlug = NULL, KasaMerchantName = NULL,
           KasaEnvironment = NULL, KasaConnectedAt = NULL
       WHERE Company_ID = ?`,
      [auth.companyId],
    );

    return NextResponse.json({ message: "Kasa account disconnected" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
