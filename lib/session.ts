import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export type UserRole = "Admin" | "Front Desk" | "Mechanic";

export interface SessionPayload {
  id: number;
  email: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  themeColor: string;
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

// Verifies the "token" cookie and returns the decoded session, or null if
// missing/invalid/expired. Uses jose (not jsonwebtoken) so the same helper
// works in both Middleware.ts (Edge runtime) and Node-runtime API routes.
export async function getSession(
  request: NextRequest,
): Promise<SessionPayload | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCompanyId(
  request: NextRequest,
): Promise<string | null> {
  const session = await getSession(request);
  return session?.companyId ?? null;
}
