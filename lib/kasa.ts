import axios from "axios";

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

// PaymentMethod values Motiq stores for a payment sourced from Kasa
export const KASA_PROVIDER_LABEL: Record<KasaProvider, string> = {
  gcash: "GCash",
  maya: "Maya",
  qr_ph: "QR Ph",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

const kasa = axios.create({
  baseURL: process.env.KASA_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.KASA_SECRET_KEY}` },
});

export async function retrieveKasaPayment(id: string): Promise<KasaPayment> {
  const { data } = await kasa.get(`/api/v1/payments/${id}`);
  return data;
}

export async function createKasaRefund(params: {
  paymentId: string;
  amount?: number; // centavos; omit for full refund
  reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "other";
}): Promise<KasaRefund> {
  const { data } = await kasa.post("/api/v1/refunds", {
    payment_id: params.paymentId,
    amount: params.amount,
    reason: params.reason,
  });
  return data;
}

export function buildKasaCheckoutUrl(opts: {
  amountCentavos: number;
  description: string;
  returnUrl: string;
}): string {
  const url = new URL("/pay", process.env.KASA_BASE_URL);
  url.searchParams.set("amount", String(opts.amountCentavos));
  url.searchParams.set("description", opts.description);
  url.searchParams.set("return_url", opts.returnUrl);
  return url.toString();
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}
