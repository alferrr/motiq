import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import axios from "axios";
import { connectCompanyKasaAccount } from "@/lib/kasa";

// This route is only ever loaded inside the popup window opened by
// Settings > Kasa Payments. On success it closes itself; the Settings tab
// notices via polling for the popup closing and re-checks the real
// connection status from the server (window.opener isn't reliably
// preserved across the cross-origin round trip through Kasa's own domain
// and back, so this doesn't try to message the opener directly).
//
// On failure, the popup itself may close before it can be read (some
// browsers/OS popup styling auto-dismiss quickly, and it's not always
// possible to tell), so the failure reason is ALSO written to a short-lived,
// non-httpOnly cookie the Settings tab reads directly once it notices the
// popup closed — the popup's own visible message is a bonus, not the only
// way to see what happened.
function popupResult(status: "connected" | "error", detail?: string) {
  const body =
    status === "connected"
      ? `<script>window.close();</script>
<p style="font:14px system-ui;color:#666;padding:24px">Connected — you can close this window.</p>`
      : `<p style="font:14px system-ui;color:#b91c1c;padding:24px 24px 8px">Could not connect Kasa${detail ? `: ${detail}` : "."}</p>
<p style="font:13px system-ui;color:#666;padding:0 24px 24px">You can close this window and try again.</p>
<div style="padding:0 24px"><button onclick="window.close()" style="font:14px system-ui;padding:8px 16px;border-radius:8px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer">Close window</button></div>`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /></head>
<body>
${body}
</body></html>`;
  const res = new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  res.cookies.delete("kasa_oauth_state");
  if (status === "error") {
    res.cookies.set("kasa_oauth_error", detail ?? "unknown error", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 120,
      path: "/",
    });
  } else {
    res.cookies.delete("kasa_oauth_error");
  }
  return res;
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "Admin")
    return popupResult("error", "not signed in as an Admin");

  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  if (error) return popupResult("error", `Kasa returned "${error}"`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const stateCookie = request.cookies.get("kasa_oauth_state")?.value;
  if (!code || !state)
    return popupResult("error", "missing code/state from Kasa's redirect");
  if (!stateCookie || state !== stateCookie)
    return popupResult(
      "error",
      "the sign-in session expired or was started twice — please try again in a single window",
    );

  try {
    const redirectUri = new URL(
      "/api/v1/company/kasa/oauth/callback",
      request.nextUrl.origin,
    ).toString();

    const { data } = await axios.post(
      new URL("/api/oauth/token", process.env.KASA_BASE_URL).toString(),
      {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.KASA_OAUTH_CLIENT_ID,
        client_secret: process.env.KASA_OAUTH_CLIENT_SECRET,
      },
    );

    const result = await connectCompanyKasaAccount(
      session.companyId,
      data.access_token,
    );
    if (!result.ok)
      return popupResult(
        "error",
        result.reason === "invalid_key"
          ? "Kasa rejected the issued key"
          : "could not reach Kasa to verify the connection",
      );
    return popupResult("connected");
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `token exchange failed (${err.response?.status ?? "network error"}: ${
          err.response?.data?.error?.message ?? err.message
        })`
      : "token exchange failed";
    console.error("Kasa OAuth token exchange failed:", err);
    return popupResult("error", detail);
  }
}
