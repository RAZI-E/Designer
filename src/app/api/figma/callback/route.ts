import { NextRequest, NextResponse } from "next/server";
import {
  parseStateCookie,
  deleteStateCookie,
  serializeTokenCookie,
  exchangeCodeForToken,
  isRequestSecure,
} from "@/lib/figma/oauth";
import { resolveRedirectUri } from "../authorize/route";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const returnedState = searchParams.get("state");

  const dashboardUrl = new URL("/dashboard", request.url);
  const secure = isRequestSecure(request);

  if (error) {
    const msg = errorDescription || error;
    dashboardUrl.searchParams.set("figma_error", msg);
    const resp = NextResponse.redirect(dashboardUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie(secure));
    return resp;
  }

  if (!code) {
    dashboardUrl.searchParams.set("figma_error", "No authorization code received from Figma. Please try again.");
    const resp = NextResponse.redirect(dashboardUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie(secure));
    return resp;
  }

  const stateCookie = parseStateCookie(request.headers.get("cookie"));
  const redirectTo = stateCookie?.redirect_to || "/dashboard";

  if (stateCookie && returnedState && stateCookie.state !== returnedState) {
    dashboardUrl.searchParams.set("figma_error", "State mismatch. The request may have been tampered with. Please try again.");
    const resp = NextResponse.redirect(dashboardUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie(secure));
    return resp;
  }

  try {
    const redirectUri = stateCookie?.redirect_uri || resolveRedirectUri(request);
    const tokens = await exchangeCodeForToken(code, redirectUri);

    const successUrl = new URL(redirectTo, request.url);
    successUrl.searchParams.set("figma_connected", "1");

    const response = NextResponse.redirect(successUrl);
    response.headers.append("Set-Cookie", deleteStateCookie(secure));
    response.headers.append("Set-Cookie", serializeTokenCookie(tokens, secure));

    return response;
  } catch (err) {
    console.error("Figma OAuth callback error:", err);
    const errMsg = err instanceof Error ? err.message : "Authentication failed";
    dashboardUrl.searchParams.set("figma_error", errMsg);
    const resp = NextResponse.redirect(dashboardUrl);
    resp.headers.append("Set-Cookie", deleteStateCookie(secure));
    return resp;
  }
}
