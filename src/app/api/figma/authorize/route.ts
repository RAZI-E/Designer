import { NextRequest, NextResponse } from "next/server";
import { generateRandomState, serializeStateCookie, isRequestSecure } from "@/lib/figma/oauth";

const VALID_FIGMA_SCOPES = new Set([
  "file_content:read",
  "file_metadata:read",
  "current_user:read",
  "files:read",
  "file_comments:read",
  "file_comments:write",
  "file_dev_resources:read",
  "file_dev_resources:write",
  "file_versions:read",
  "folders:read",
]);

export function sanitizeScope(scopeStr?: string | null): string {
  if (!scopeStr) return "file_content:read,current_user:read";
  const filtered = scopeStr
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => VALID_FIGMA_SCOPES.has(s));
  return filtered.length > 0 ? filtered.join(",") : "file_content:read,current_user:read";
}

export function resolveRedirectUri(request: NextRequest): string {
  const customRedirect = request.nextUrl.searchParams.get("redirect_uri");
  if (customRedirect) return customRedirect;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.") ||
    host.endsWith(".local");

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
  const customScope = searchParams.get("scope");
  const rawScope = customScope || process.env.FIGMA_OAUTH_SCOPE || "file_content:read,current_user:read";
  const scope = sanitizeScope(rawScope);

  const state = generateRandomState();

  const figmaAuthUrl = new URL("https://www.figma.com/oauth");
  figmaAuthUrl.searchParams.set("client_id", clientId);
  figmaAuthUrl.searchParams.set("redirect_uri", redirectUri);
  figmaAuthUrl.searchParams.set("scope", scope);
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
