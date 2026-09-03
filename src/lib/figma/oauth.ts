import crypto from "crypto";

export interface FigmaOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
}

export interface FigmaOAuthState {
  state: string;
  redirect_to?: string;
  redirect_uri?: string;
}

const TOKEN_COOKIE = "figma_token";
const STATE_COOKIE = "figma_state";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function isRequestSecure(request?: { url?: string; headers?: { get(name: string): string | null } }): boolean {
  if (!request) {
    return process.env.NODE_ENV === "production";
  }
  const proto = request.headers?.get("x-forwarded-proto") || (request.url?.startsWith("https://") ? "https" : "http");
  return proto === "https";
}

export function generateRandomState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function serializeTokenCookie(tokens: FigmaOAuthTokens, secure: boolean = false): string {
  const value = JSON.stringify(tokens);
  const parts = [
    `${TOKEN_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${TOKEN_MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function parseTokenCookie(cookieHeader: string | null): FigmaOAuthTokens | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const raw = cookies.find((c) => c.startsWith(`${TOKEN_COOKIE}=`));
  if (!raw) return null;
  const value = decodeURIComponent(raw.split("=").slice(1).join("="));
  try {
    return JSON.parse(value) as FigmaOAuthTokens;
  } catch {
    return null;
  }
}

export function deleteTokenCookie(secure: boolean = false): string {
  const parts = [`${TOKEN_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function serializeStateCookie(state: FigmaOAuthState, secure: boolean = false): string {
  const value = JSON.stringify(state);
  const parts = [
    `${STATE_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=600",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function parseStateCookie(cookieHeader: string | null): FigmaOAuthState | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const raw = cookies.find((c) => c.startsWith(`${STATE_COOKIE}=`));
  if (!raw) return null;
  const value = decodeURIComponent(raw.split("=").slice(1).join("="));
  try {
    return JSON.parse(value) as FigmaOAuthState;
  } catch {
    return null;
  }
}

export function deleteStateCookie(secure: boolean = false): string {
  const parts = [`${STATE_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function exchangeCodeForToken(code: string, redirectUriOverride?: string): Promise<FigmaOAuthTokens> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const redirectUri = redirectUriOverride || process.env.FIGMA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Figma OAuth credentials not configured");
  }

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${err}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("No access_token in response");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type || "bearer",
  };
}

export async function refreshFigmaToken(refreshToken: string): Promise<FigmaOAuthTokens> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Figma OAuth credentials not configured");
  }

  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${err}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type || "bearer",
  };
}

export async function getValidFigmaToken(cookieHeader: string | null): Promise<string> {
  let tokens = parseTokenCookie(cookieHeader);
  if (!tokens) {
    throw new Error("Not authenticated with Figma");
  }
  if (Date.now() >= tokens.expires_at - 60000) {
    tokens = await refreshFigmaToken(tokens.refresh_token);
  }
  return tokens.access_token;
}
