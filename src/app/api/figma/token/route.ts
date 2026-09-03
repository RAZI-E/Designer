import { NextRequest, NextResponse } from "next/server";
import { parseTokenCookie } from "@/lib/figma/oauth";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  const tokens = parseTokenCookie(cookieHeader);

  if (!tokens) {
    return NextResponse.json({ authenticated: false });
  }

  const isExpired = Date.now() >= tokens.expires_at;

  return NextResponse.json({
    authenticated: true,
    expired: isExpired,
    expires_at: tokens.expires_at,
  });
}
