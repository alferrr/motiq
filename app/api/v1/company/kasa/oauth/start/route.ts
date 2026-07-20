import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import crypto from "crypto";

// Real navigation target (an <a href>, not an axios call) — the browser
// leaves Motiq entirely to authenticate/consent on Kasa Dashboard, so the
// merchant's raw secret key never passes through Motiq's frontend.
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session)
    return NextResponse.redirect(new URL("/signin", request.nextUrl.origin));
  if (session.role !== "Admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const state = crypto.randomBytes(24).toString("hex");
  const redirectUri = new URL(
    "/api/v1/company/kasa/oauth/callback",
    request.nextUrl.origin,
  ).toString();

  const authorizeUrl = new URL("/oauth/authorize", process.env.KASA_BASE_URL);
  authorizeUrl.searchParams.set("client_id", process.env.KASA_OAUTH_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authorizeUrl.toString());
  // short-lived CSRF token — verified against the `state` query param when
  // Kasa redirects back to the callback route below
  response.cookies.set("kasa_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  // clear any leftover reason from a previous failed attempt so the
  // Settings page doesn't show a stale error for this new one
  response.cookies.delete("kasa_oauth_error");
  return response;
}
