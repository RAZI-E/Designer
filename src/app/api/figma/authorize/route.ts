import { NextRequest, NextResponse } from "next/server";
import { generateRandomState, serializeStateCookie, isRequestSecure } from "@/lib/figma/oauth";

export function resolveRedirectUri(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  if (isLocal) {
    const proto = request.headers.get("x-forwarded-proto") || (request.nextUrl.protocol.replace(":", "")) || "http";
    return `${proto}://${host}/api/figma/callback`;
  }

  return process.env.FIGMA_REDIRECT_URI || `${request.nextUrl.origin}/api/figma/callback`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const redirectUri = resolveRedirectUri(request);

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Figma OAuth is not configured. Set FIGMA_CLIENT_ID and FIGMA_REDIRECT_URI." },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";

  const state = generateRandomState();

  const figmaAuthUrl = new URL("https://www.figma.com/oauth");
  figmaAuthUrl.searchParams.set("client_id", clientId);
  figmaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  figmaAuthUrl.searchParams.set("scope", "file_read");
  figmaAuthUrl.searchParams.set("state", state);
  figmaAuthUrl.searchParams.set("response_type", "code");

  const secure = isRequestSecure(request);
  const response = NextResponse.redirect(figmaAuthUrl.toString());
  response.headers.append(
    "Set-Cookie",
    serializeStateCookie({ state, redirect_to: redirectTo, redirect_uri: redirectUri }, secure)
  );

  return response;
}
