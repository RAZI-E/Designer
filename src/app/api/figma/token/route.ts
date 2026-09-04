import { NextRequest, NextResponse } from "next/server";
import {
  parseTokenCookie,
  parsePatCookie,
  serializePatCookie,
  refreshFigmaToken,
  serializeTokenCookie,
  deleteTokenCookie,
  deletePatCookie,
  isRequestSecure,
} from "@/lib/figma/oauth";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");

  // Check for Personal Access Token first
  const pat = parsePatCookie(cookieHeader);
  if (pat) {
    return NextResponse.json({
      authenticated: true,
      type: "pat",
      expired: false,
    });
  }

  // Check for OAuth token
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
        type: "oauth",
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
    type: "oauth",
    expired: false,
    expires_at: tokens.expires_at,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json({ error: "Personal Access Token is required" }, { status: 400 });
    }

    const trimmed = token.trim();
    // Validate with Figma API
    const res = await fetch("https://api.figma.com/v1/me", {
      headers: { "X-Figma-Token": trimmed },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || "Invalid Figma Personal Access Token. Please check your token and try again." },
        { status: 401 }
      );
    }

    const userData = await res.json();
    const secure = isRequestSecure(request);

    const response = NextResponse.json({
      authenticated: true,
      type: "pat",
      user: {
        id: userData.id || "",
        email: userData.email || "",
        handle: userData.handle || userData.name || "Figma User",
        img_url: userData.img_url || "",
      },
    });

    response.headers.append("Set-Cookie", serializePatCookie(trimmed, secure));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify token" },
      { status: 500 }
    );
  }
}

