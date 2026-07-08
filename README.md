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

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
