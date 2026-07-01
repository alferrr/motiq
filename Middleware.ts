import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/",
  "/register",
  "/register/success",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/verify-company",
  "/api/v1/auth/logout",
  "/api/v1/payment-callback",
  "/pay-status",
];

const ROLE_PATHS: Record<string, string[]> = {
  "/users": ["Admin"],
  "/settings": ["Admin"],
  "/reports": ["Admin", "Front Desk"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  // no token — redirect to login
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // verify token
  let payload: any;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload: p } = await jwtVerify(token, secret);
    payload = p;
  } catch {
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

  // forward user info to API routes via headers
  const headers = new Headers(request.headers);
  headers.set("x-user-id", String(payload.id));
  headers.set("x-user-role", String(payload.role));
  headers.set("x-company-id", String(payload.companyId));

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
