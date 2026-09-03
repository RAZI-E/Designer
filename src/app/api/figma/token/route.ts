import { NextRequest, NextResponse } from "next/server";
import {
  parseTokenCookie,
  refreshFigmaToken,
  serializeTokenCookie,
  deleteTokenCookie,
  isRequestSecure,
} from "@/lib/figma/oauth";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  let tokens = parseTokenCookie(cookieHeader);

  if (!tokens) {
    return NextResponse.json({ authenticated: false });
  }

  const secure = isRequestSecure(request);
  const isExpiringSoon = Date.now() >= tokens.expires_at - 60000;

  if (isExpiringSoon && tokens.refresh_token) {
    try {
      const newTokens = await refreshFigmaToken(tokens.refresh_token);
      const response = NextResponse.json({
        authenticated: true,
        expired: false,
        expires_at: newTokens.expires_at,
      });
      response.headers.append("Set-Cookie", serializeTokenCookie(newTokens, secure));
      return response;
    } catch {
      const response = NextResponse.json({ authenticated: false, expired: true });
      response.headers.append("Set-Cookie", deleteTokenCookie(secure));
      return response;
    }
  }

  return NextResponse.json({
    authenticated: true,
    expired: false,
    expires_at: tokens.expires_at,
  });
}
