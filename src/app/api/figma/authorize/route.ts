import { NextRequest, NextResponse } from "next/server";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  serializeStateCookie,
} from "@/lib/figma/oauth";

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

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const state = {
    code_verifier: codeVerifier,
    redirect_to: redirectTo,
  };

  const figmaAuthUrl = new URL("https://www.figma.com/oauth");
  figmaAuthUrl.searchParams.set("client_id", clientId);
  figmaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  figmaAuthUrl.searchParams.set("scope", "file_read");
  figmaAuthUrl.searchParams.set("state", codeVerifier);
  figmaAuthUrl.searchParams.set("response_type", "code");
  figmaAuthUrl.searchParams.set("code_challenge", codeChallenge);
  figmaAuthUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(figmaAuthUrl.toString());
  response.headers.append("Set-Cookie", serializeStateCookie(state));

  return response;
}
