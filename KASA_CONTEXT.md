# Kasa Dashboard — Integration Context

## What it is

Kasa Dashboard is a payment infrastructure platform for the Philippines (GCash, Maya, QR Ph, cards, bank transfers) — the Stripe equivalent for PH. It exposes a REST API at `/api/v1` and a Node.js SDK (`kasa-node`) for server-side integration.

---

## Authentication

All `/api/v1` requests require an API key in the `Authorization` header:

```
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx
```

Keys are generated from the Kasa Dashboard at `/dashboard/api-keys`. Two types:

- `sk_*` — **Secret key** — server-side only, never expose client-side
- `pk_*` — **Publishable key** — safe for client-side

Two environments: `live` and `sandbox`.

---

## Base URL

```
http://localhost:3001        # local dev
https://your-domain.com     # production (replace with actual URL)
```

---

## Data types

- All monetary amounts are **integers in centavos** — ₱1.00 = `100`
- All timestamps are ISO 8601 strings
- All IDs are UUID strings

### Enums

```ts
type Provider = "gcash" | "maya" | "qr_ph" | "card" | "bank_transfer";

type PaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

type RefundStatus = "pending" | "succeeded" | "failed";

type RefundReason =
  | "duplicate"
  | "fraudulent"
  | "requested_by_customer"
  | "other";

type Environment = "live" | "sandbox";
```

### Payment object

```ts
{
  object: "payment",
  id: string,
  merchant_id: string,
  customer_id: string | null,
  amount: number,           // centavos
  currency: string,         // always "PHP"
  provider: Provider,
  status: PaymentStatus,
  description: string | null,
  metadata: Record<string, unknown> | null,
  environment: Environment,
  created_at: string,
  updated_at: string,
  customer?: {
    id: string,
    full_name: string | null,
    email: string | null,
  }
}
```

### Customer object

```ts
{
  object: "customer",
  id: string,
  merchant_id: string,
  full_name: string | null,
  email: string | null,
  phone: string | null,
  metadata: Record<string, unknown> | null,
  created_at: string,
  updated_at: string,
}
```

### Refund object

```ts
{
  object: "refund",
  id: string,
  payment_id: string,
  merchant_id: string,
  amount: number,           // centavos
  reason: RefundReason | null,
  status: RefundStatus,
  created_at: string,
  updated_at: string,
}
```

### List response

```ts
{
  object: "list",
  data: T[],
  total: number,
  page: number,
  total_pages: number,
}
```

### Error response

```ts
{
  error: {
    code: string,
    message: string,
    param?: string,     // which field caused the error
  }
}
```

HTTP status codes: `400` bad request, `401` unauthorized, `404` not found, `422` unprocessable.

---

## REST API Endpoints

### Payments

**List payments**

```
GET /api/v1/payments
Query params: limit (default 20), page (default 1), status, customer_id
```

**Create payment**

```
POST /api/v1/payments
Body:
{
  amount: number,           // required, centavos > 0
  provider: Provider,       // required
  customer_id?: string,
  description?: string,
  metadata?: object,
}
```

**Retrieve payment**

```
GET /api/v1/payments/:id
```

---

### Customers

**List customers**

```
GET /api/v1/customers
Query params: limit, page, email
```

**Create customer**

```
POST /api/v1/customers
Body:
{
  email?: string,           // at least email or full_name required
  full_name?: string,
  phone?: string,
  metadata?: object,
}
```

**Retrieve customer**

```
GET /api/v1/customers/:id
```

**Update customer**

```
PATCH /api/v1/customers/:id
Body:
{
  email?: string,
  full_name?: string,
  phone?: string,
  metadata?: object,
}
```

---

### Refunds

**Create refund**

```
POST /api/v1/refunds
Body:
{
  payment_id: string,       // required — must be a succeeded payment
  amount?: number,          // centavos; omit to refund the full amount
  reason?: RefundReason,
}
```

**Retrieve refund**

```
GET /api/v1/refunds/:id
```

---

## SDK — `kasa-node`

The SDK lives at `sdk/` inside the Kasa Dashboard repo. It's a local npm package.

### Install

```bash
# Build first (do this once, and again after any SDK changes)
cd /path/to/kasa-dashboard/sdk && npm run build

# Install into your other project using a local path
cd /path/to/your-other-project
npm install /path/to/kasa-dashboard/sdk
```

### Initialize

```ts
import { KasaClient } from "kasa-node";

const kasa = new KasaClient({
  apiKey: "sk_sandbox_...", // from /dashboard/api-keys
  baseUrl: "http://localhost:3001", // Kasa Dashboard URL
  timeout: 30_000, // optional, ms — default 30s
});
```

### Payments

```ts
// Create
const payment = await kasa.payments.create({
  amount: 15000, // ₱150.00
  provider: "gcash",
  customer_id: "...", // optional
  description: "Order #123",
});

// Retrieve
const payment = await kasa.payments.retrieve("pay_uuid_here");

// List
const { data, total, total_pages } = await kasa.payments.list({
  status: "succeeded",
  customer_id: "cust_uuid_here",
  limit: 20,
  page: 1,
});
```

### Customers

```ts
// Create
const customer = await kasa.customers.create({
  email: "juan@example.ph",
  full_name: "Juan dela Cruz",
  phone: "+639171234567",
});

// Retrieve
const customer = await kasa.customers.retrieve("cust_uuid_here");

// Update
const updated = await kasa.customers.update("cust_uuid_here", {
  phone: "+639189999999",
});

// List
const { data } = await kasa.customers.list({
  email: "juan@example.ph",
  limit: 20,
});
```

### Refunds

```ts
// Full refund (omit amount to refund everything)
const refund = await kasa.refunds.create({
  payment_id: "pay_uuid_here",
  reason: "requested_by_customer",
});

// Partial refund
const refund = await kasa.refunds.create({
  payment_id: "pay_uuid_here",
  amount: 5000, // ₱50.00
  reason: "duplicate",
});

// Retrieve
const refund = await kasa.refunds.retrieve("ref_uuid_here");
```

### Error handling

```ts
import {
  KasaClient,
  KasaError,
  KasaAuthError,
  KasaNotFoundError,
} from "kasa-node";

try {
  const payment = await kasa.payments.create({
    amount: 15000,
    provider: "gcash",
  });
} catch (err) {
  if (err instanceof KasaAuthError) {
    // 401 — bad or missing API key
  } else if (err instanceof KasaNotFoundError) {
    // 404 — resource not found or belongs to another merchant
  } else if (err instanceof KasaError) {
    console.log(err.code, err.message, err.status, err.param);
  }
}
```

---

## Checkout page (fake payment gateway)

A public-facing checkout page lives at `/pay`. Customers visit this to pay the merchant. It's a 3-step flow:

1. **Details** — customer fills in name, email, phone, amount, note
2. **Payment method** — GCash / Maya / QR Ph / Bank Transfer
3. **Instructions** — provider-specific payment UI with copy buttons and a reference ID

**URL:**

```
http://localhost:3000/pay

# Pre-fill amount and description via query params:
http://localhost:3000/pay?amount=15000&description=Order+%23123
```

`amount` is in **centavos** (15000 = ₱150.00). When provided, the amount field is locked and the customer cannot change it.

**What each provider shows:**

- **GCash** — static QR image from `public/gcash-qr.png` + reference number to add in remarks
- **Maya** — Maya number, account name, reference number to add in transfer note
- **QR Ph** — generated QR code from the reference ID, scannable by any PH banking app
- **Bank Transfer** — bank name, account name, account number, reference for remarks

Every payment creates a record in the Kasa DB (`payments` table, status `requires_payment_method`). The merchant can view all payments in the dashboard at `/dashboard/transactions`.

**Required `.env` vars on the Kasa Dashboard server:**

```env
CHECKOUT_MERCHANT_ID="uuid-of-your-merchant-from-db"
CHECKOUT_MERCHANT_NAME="Your Business Name"
CHECKOUT_BANK_NAME="BDO Unibank"
CHECKOUT_BANK_ACCOUNT_NAME="Your Name"
CHECKOUT_BANK_ACCOUNT_NUMBER="1234567890"
CHECKOUT_MAYA_NUMBER="09171234567"
```

---

## Kasa Dashboard tech stack (for context)

- **Next.js 16** App Router — `proxy.ts` not `middleware.ts`, `params`/`searchParams` are `Promise<>` types requiring `await`
- **Prisma 7** with `@prisma/adapter-mariadb` — requires adapter passed into constructor
- **MySQL / MariaDB** — amounts stored as `BIGINT amount_centavos`, UUIDs as `CHAR(36)`
- **API key auth** — raw key never stored; SHA-256 hash stored in `api_keys.key_hash`
- **Session auth** — JWT in httpOnly cookie `"session"` via `jose`; used only by dashboard pages, NOT by `/api/v1` routes

---

## What's built

| Feature                                                 | Status       |
| ------------------------------------------------------- | ------------ |
| Auth (login / signup / logout)                          | ✅           |
| Dashboard (metrics, revenue chart, recent transactions) | ✅           |
| Transactions page (filters, search, pagination)         | ✅           |
| API Keys page (create, revoke, display)                 | ✅           |
| `/api/v1` REST API (payments, customers, refunds)       | ✅           |
| `kasa-node` SDK                                         | ✅           |
| Public checkout page (`/pay`)                           | ✅           |
| Customers page (dashboard UI)                           | ❌ not built |
| Invoices, Payment links, Webhooks, Analytics            | ❌ not built |
| Settings page                                           | ❌ not built |

