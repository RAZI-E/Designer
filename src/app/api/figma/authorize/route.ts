import { NextRequest, NextResponse } from "next/server";
import { generateRandomState, serializeStateCookie } from "@/lib/figma/oauth";

export async function GET(request: NextRequest) {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const redirectUri = process.env.FIGMA_REDIRECT_URI;

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

  const response = NextResponse.redirect(figmaAuthUrl.toString());
  response.headers.append("Set-Cookie", serializeStateCookie({ state, redirect_to: redirectTo }));

  return response;
}
