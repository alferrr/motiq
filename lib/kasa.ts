import axios from "axios";
import { pool } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type KasaProvider = "gcash" | "maya" | "qr_ph" | "card" | "bank_transfer";

export type KasaPaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type KasaPayment = {
  object: "payment";
  id: string;
  merchant_id: string;
  customer_id: string | null;
  amount: number; // centavos
  currency: string;
  provider: KasaProvider;
  status: KasaPaymentStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type KasaRefund = {
  object: "refund";
  id: string;
  payment_id: string;
  amount: number; // centavos
  status: "pending" | "succeeded" | "failed";
  created_at: string;
  updated_at: string;
};

export type KasaMerchant = {
  object: "merchant";
  id: string;
  slug: string;
  name: string;
  environment: "live" | "sandbox";
};

// PaymentMethod values Motiq stores for a payment sourced from Kasa
export const KASA_PROVIDER_LABEL: Record<KasaProvider, string> = {
  gcash: "GCash",
  maya: "Maya",
  qr_ph: "QR Ph",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

// Looks up and decrypts a company's linked Kasa credentials. Returns null
// if the company hasn't connected a Kasa account yet — callers should treat
// that as "Kasa features unavailable for this company", not an error.
export async function getCompanyKasaCredentials(
  companyId: string,
): Promise<{ apiKey: string; merchantSlug: string | null } | null> {
  const [[row]]: any = await pool.query(
    `SELECT KasaSecretKey, KasaMerchantSlug FROM Company WHERE Company_ID = ? LIMIT 1`,
    [companyId],
  );
  if (!row?.KasaSecretKey) return null;
  return {
    apiKey: decryptSecret(row.KasaSecretKey),
    merchantSlug: row.KasaMerchantSlug ?? null,
  };
}

// Every call is scoped to a specific company's own Kasa secret key — there
// is no shared/global merchant credential, so a fresh client is built per
// call rather than once at module load.
function kasaClient(apiKey: string) {
  return axios.create({
    baseURL: process.env.KASA_BASE_URL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function getKasaMerchant(apiKey: string): Promise<KasaMerchant> {
  const { data } = await kasaClient(apiKey).get("/api/v1/merchant");
  return data;
}

export type KasaConnectResult =
  | { ok: true; merchant: KasaMerchant }
  | { ok: false; reason: "invalid_key" }
  | { ok: false; reason: "unreachable" };

// Validates a Kasa secret key (via the whoami endpoint) and, if valid,
// encrypts and persists it as the company's linked Kasa account. Shared by
// the manual "paste a key" connect route and the OAuth callback — both end
// up with a raw secret key that needs the exact same validate+store step.
export async function connectCompanyKasaAccount(
  companyId: string,
  secretKey: string,
): Promise<KasaConnectResult> {
  let merchant: KasaMerchant;
  try {
    merchant = await getKasaMerchant(secretKey);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401)
      return { ok: false, reason: "invalid_key" };
    console.error("Kasa merchant lookup failed:", err);
    return { ok: false, reason: "unreachable" };
  }

  const encrypted = encryptSecret(secretKey);
  await pool.query(
    `UPDATE Company
     SET KasaSecretKey = ?, KasaMerchantSlug = ?, KasaMerchantName = ?,
         KasaEnvironment = ?, KasaConnectedAt = NOW()
     WHERE Company_ID = ?`,
    [encrypted, merchant.slug, merchant.name, merchant.environment, companyId],
  );

  return { ok: true, merchant };
}

export async function retrieveKasaPayment(
  apiKey: string,
  id: string,
): Promise<KasaPayment> {
  const { data } = await kasaClient(apiKey).get(`/api/v1/payments/${id}`);
  return data;
}

export async function createKasaRefund(
  apiKey: string,
  params: {
    paymentId: string;
    amount?: number; // centavos; omit for full refund
    reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "other";
  },
): Promise<KasaRefund> {
  const { data } = await kasaClient(apiKey).post("/api/v1/refunds", {
    payment_id: params.paymentId,
    amount: params.amount,
    reason: params.reason,
  });
  return data;
}

// No API key needed — /pay is a public checkout page. merchantSlug routes
// the payment to the right company's Kasa merchant account; omitted, it
// falls back to Kasa Dashboard's own CHECKOUT_MERCHANT_ID default.
export function buildKasaCheckoutUrl(opts: {
  amountCentavos: number;
  description: string;
  returnUrl: string;
  merchantSlug?: string | null;
}): string {
  const url = new URL("/pay", process.env.KASA_BASE_URL);
  url.searchParams.set("amount", String(opts.amountCentavos));
  url.searchParams.set("description", opts.description);
  url.searchParams.set("return_url", opts.returnUrl);
  if (opts.merchantSlug) url.searchParams.set("m", opts.merchantSlug);
  return url.toString();
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}
