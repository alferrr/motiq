import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/owner",
  "/register",
  "/register/success",
  "/forgot",
  "/reset-password",
  "/api/v1/auth/login",
  "/api/v1/auth/owner-login",
  "/api/v1/auth/register",
  "/api/v1/auth/verify-company",
  "/api/v1/auth/logout",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/payment-callback",
  "/pay-status",
  "/api/health",
];

// paths gated by a specific account (session email), not by role — used for
// the owner-only landing-page CMS, which isn't a tenant-scoped concern
const OWNER_PATHS = ["/content", "/api/v1/content"];

const ROLE_PATHS: Record<string, string[]> = {
  // Admin only
  "/users": ["Admin"],
  "/api/v1/users": ["Admin"],
  "/settings": ["Admin"],
  "/api/v1/company": ["Admin"],
  "/reports": ["Admin"],
  "/api/v1/reports": ["Admin"],
  // Admin + Front Desk (Mechanics don't need customer/billing data)
  "/customers": ["Admin", "Front Desk"],
  "/api/v1/customers": ["Admin", "Front Desk"],
  "/invoices": ["Admin", "Front Desk"],
  "/api/v1/invoices": ["Admin", "Front Desk"],
  "/payments": ["Admin", "Front Desk"],
  "/api/v1/payments": ["Admin", "Front Desk"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // verify session (missing, invalid, or expired token all resolve to null)
  const payload = await getSession(request);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.delete("token");
    return res;
  }

  // role-based path guard
  for (const [path, roles] of Object.entries(ROLE_PATHS)) {
    if (pathname.startsWith(path) && !roles.includes(payload.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // owner-only path guard (email-based, not role-based)
  if (OWNER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (payload.email !== process.env.OWNER_EMAIL) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // forward user info to API routes via headers
  const headers = new Headers(request.headers);
  headers.set("x-user-id", String(payload.id));
  headers.set("x-user-role", String(payload.role));
  headers.set("x-company-id", String(payload.companyId));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)$).*)",
  ],
};
