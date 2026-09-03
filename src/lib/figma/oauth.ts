import crypto from "crypto";

export interface FigmaOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
}

export interface FigmaOAuthState {
  code_verifier: string;
  redirect_to?: string;
}

const TOKEN_COOKIE = "figma_token";
const STATE_COOKIE = "figma_state";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function serializeTokenCookie(tokens: FigmaOAuthTokens): string {
  const value = JSON.stringify(tokens);
  return [
    `${TOKEN_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${TOKEN_MAX_AGE}`,
  ].join("; ");
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

export function deleteTokenCookie(): string {
  return [`${TOKEN_COOKIE}=`, "Path=/", "HttpOnly", "Secure", "SameSite=Lax", "Max-Age=0"].join("; ");
}

export function serializeStateCookie(state: FigmaOAuthState): string {
  const value = JSON.stringify(state);
  return [
    `${STATE_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=600",
  ].join("; ");
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

export function deleteStateCookie(): string {
  return [`${STATE_COOKIE}=`, "Path=/", "HttpOnly", "Secure", "SameSite=Lax", "Max-Age=0"].join("; ");
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<FigmaOAuthTokens> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const redirectUri = process.env.FIGMA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Figma OAuth credentials not configured");
  }

  const response = await fetch("https://www.figma.com/api/oauth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
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

  const response = await fetch("https://www.figma.com/api/oauth/refresh", {
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
