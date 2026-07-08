# Motiq

Motiq is an all-in-one management platform for independent auto repair garages — customers, vehicles, job orders, inventory, appointments, invoicing, and payments in one multi-tenant system.

> This project was built as the final project for **Information Management 2**.

## Team

| Name | Role |
| --- | --- |
| Alfer Mercado | Lead Developer |
| Eurissa Fuertes | Project Lead |
| Sean Galo | Documentation |
| Patrick Jayme | Documentation |
| Gabriel Tangub | Documentation |

## Features

### Multi-tenant Authentication & Onboarding
- 7-step company registration wizard — company info, branding/accent color, garage details, business/legal registration, owner info, admin account, review — with a human-readable generated Company ID (e.g. `MERCADOAUTO-A3F7K2PQ`)
- 2-step sign-in — Company ID verification (adopts the company's branding before login) then email/password credentials, JWT-based session (httpOnly cookie)
- "Continue as {Company}" remembered-company sign-in, with an auto-detected brand-logo avatar (SQL `LIKE` match against a car-brand reference table, falling back to the company's initial)
- Self-service forgot/reset password with time-limited, single-purpose signed tokens
- bcrypt password hashing throughout

### Role-Based Access Control
Three roles, enforced both in the UI (role-aware sidebar) and at the API level:
- **Admin** — full access, including Users, Settings, and Reports
- **Front Desk** — day-to-day operations: customers, vehicles, jobs, invoices, payments, appointments, inventory
- **Mechanic** — a personal "My Jobs" view plus read-only access to vehicles/services/job orders/inventory/appointments; can update jobs assigned to them

### Dashboard & Analytics
Role-specific dashboards — Admins see revenue trends, active repairs, and low-stock alerts; Front Desk sees today's appointments/jobs and recent activity; Mechanics see their own job queue.

### Customer & Vehicle Management
Searchable customer records with full vehicle and job history; vehicle registration (plate, make, model, year, VIN, color, mileage) with per-vehicle repair history.

### Service Catalog
Reusable services with category, description, and labor rate, consumed by job orders for cost calculation.

### Job Orders / Repair Management
- Status lifecycle: Pending → In Progress → Completed → Released
- Mechanic assignment, diagnosis, labor hours, services performed, and parts used — with automatic inventory deduction/restoration
- Auto-computed totals; completing a job auto-generates and emails the invoice
- List and calendar-friendly search/filtering

### Inventory Management
Parts catalog with stock tracking, automatic low-stock/out-of-stock flagging, and direct stock adjustment.

### Appointments
Calendar and list views, double-booking prevention, status tracking (Scheduled/Completed/Cancelled), and confirmation emails.

### Invoicing & Payments
- Invoices generated from completed job orders, with server-computed totals
- **Kasa payment gateway** integration (GCash, Maya, QR Ph, Bank Transfer, Card) alongside manual cash/card recording
- Idempotent payment callbacks, on-demand status refresh, full/partial refunds
- Payment receipt and invoice emails automatically sent

### Reports & Analytics (Admin)
Revenue over time, repairs by status, revenue by service category, and a top-mechanics leaderboard across selectable time ranges.

### User (Staff) Management (Admin)
Create/edit/delete staff accounts across all three roles, with per-role counts and search.

### Settings
Per-user light/dark theme and accent color, company profile management, and account settings with password change.

### Notifications & Email
In-app alerts (low stock, vehicles ready for pickup, today's appointments) plus transactional, per-company-branded emails via Resend for appointments, job updates, invoices, payments, and password resets.

### Public Site
A marketing landing page and an unauthenticated payment-status confirmation page for Kasa checkout redirects.

## Tech Stack

- **Framework**: Next.js (App Router), React, TypeScript
- **Database**: MySQL (`mysql2`, no ORM)
- **Auth**: JWT (`jsonwebtoken`/`jose`), `bcryptjs`
- **Validation**: Zod
- **Email**: Resend
- **Payments**: Kasa (Philippine payment gateway)
- **Charts**: Recharts
- **UI**: Tailwind CSS, Radix UI, shadcn, Lucide/React Icons
- **HTTP**: Axios

## Getting Started

### Prerequisites
- Node.js 20+
- A MySQL database

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env.local` file in the project root:
```bash
# Database
MYSQL_HOST=
MYSQL_PORT=3306
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=

# Auth
JWT_SECRET=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Kasa payment gateway
KASA_BASE_URL=
KASA_SECRET_KEY=
```

### 3. Set up the database
Apply the schema, then run the migrations in `db/migrations/` in order against your MySQL database (e.g. `mysql < db/migrations/00X_*.sql`).

### 4. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Other scripts
```bash
npm run build   # production build
npm run start   # run a production build
npm run lint    # lint the codebase
```

## Contributing

This repository is maintained by the team listed above as part of a course requirement. If you're on the team:

1. Branch off `main` for your feature/fix (`git checkout -b feature/short-description`).
2. Keep commits scoped and descriptive.
3. Open a pull request into `main` for review before merging.
4. Make sure `npm run lint` and `npm run build` pass before requesting review.

This project isn't currently open to outside contributions, since it's tied to a specific academic submission.

## License

This project was built to fulfill a course requirement for **Information Management 2** and is intended for educational purposes only — it is not licensed for production or commercial use. All rights reserved by the team members listed above unless otherwise agreed.
