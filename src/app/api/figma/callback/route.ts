import { NextRequest, NextResponse } from "next/server";
import {
  serializeTokenCookie,
  parseStateCookie,
  deleteStateCookie,
  type FigmaOAuthTokens,
} from "@/lib/figma/oauth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    const errorDescription = searchParams.get("error_description") || error;
    return NextResponse.redirect(
      new URL(`/dashboard?figma_error=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?figma_error=No+authorization+code+received", request.url)
    );
  }

  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const redirectUri = process.env.FIGMA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL("/dashboard?figma_error=OAuth+not+configured", request.url)
    );
  }

  let redirectTo = "/dashboard";
  if (stateParam) {
    try {
      const state = parseStateCookie(request.headers.get("cookie"));
      if (state?.redirect_to) {
        redirectTo = state.redirect_to;
      }
    } catch {
      // ignore
    }
  }

  try {
    const tokenResponse = await fetch("https://www.figma.com/api/oauth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Figma token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL(`/dashboard?figma_error=${encodeURIComponent("Token exchange failed")}`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    const tokens: FigmaOAuthTokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      expires_at: Date.now() + tokenData.expires_in * 1000,
      token_type: tokenData.token_type || "bearer",
    };

    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.headers.append("Set-Cookie", serializeTokenCookie(tokens));
    response.headers.append("Set-Cookie", deleteStateCookie());

    return response;
  } catch (err) {
    console.error("Figma OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?figma_error=Authentication+failed", request.url)
    );
  }
}
