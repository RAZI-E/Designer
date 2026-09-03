import { NextRequest, NextResponse } from "next/server";
import { parseTokenCookie, refreshFigmaToken } from "@/lib/figma/oauth";

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const tokens = parseTokenCookie(cookieHeader);

  if (!tokens) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (Date.now() < tokens.expires_at - 60000) {
    return NextResponse.json({
      access_token: tokens.access_token,
      expires_at: tokens.expires_at,
    });
  }

  try {
    const newTokens = await refreshFigmaToken(tokens.refresh_token);
    const response = NextResponse.json({
      access_token: newTokens.access_token,
      expires_at: newTokens.expires_at,
    });
    response.headers.append("Set-Cookie", (
      `figma_token=${encodeURIComponent(JSON.stringify(newTokens))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    ));
    return response;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 401 });
  }
}
