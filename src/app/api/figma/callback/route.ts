import { NextRequest, NextResponse } from "next/server";
import {
  parseStateCookie,
  deleteStateCookie,
  exchangeCodeForToken,
} from "@/lib/figma/oauth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const dashboardUrl = new URL("/dashboard", request.url);

  if (error) {
    const desc = searchParams.get("error_description") || error;
    dashboardUrl.searchParams.set("figma_error", desc);
    const resp = NextResponse.redirect(dashboardUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie());
    return resp;
  }

  if (!code) {
    dashboardUrl.searchParams.set("figma_error", "No authorization code received");
    const resp = NextResponse.redirect(dashboardUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie());
    return resp;
  }

  const state = parseStateCookie(request.headers.get("cookie"));
  const codeVerifier = state?.code_verifier;
  const redirectTo = state?.redirect_to || "/dashboard";

  if (!codeVerifier) {
    const errUrl = new URL("/dashboard", request.url);
    errUrl.searchParams.set("figma_error", "OAuth state expired. Please try again.");
    const resp = NextResponse.redirect(errUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie());
    return resp;
  }

  try {
    const tokens = await exchangeCodeForToken(code, codeVerifier);

    const successUrl = new URL(redirectTo, request.url);
    successUrl.searchParams.set("figma_connected", "1");

    const response = NextResponse.redirect(successUrl);
    response.headers.append("Set-Cookie", deleteStateCookie());
    response.headers.append("Set-Cookie", (
      `figma_token=${encodeURIComponent(JSON.stringify(tokens))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    ));

    return response;
  } catch (err) {
    console.error("Figma OAuth callback error:", err);
    const errUrl = new URL("/dashboard", request.url);
    errUrl.searchParams.set("figma_error", err instanceof Error ? err.message : "Authentication failed");
    const resp = NextResponse.redirect(errUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie());
    return resp;
  }
}
