export interface FigmaOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
}

export interface FigmaOAuthState {
  redirect_to?: string;
}

const COOKIE_NAME = "figma_oauth_token";
const STATE_COOKIE_NAME = "figma_oauth_state";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function serializeTokenCookie(tokens: FigmaOAuthTokens): string {
  const value = JSON.stringify(tokens);
  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
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
  const tokenCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!tokenCookie) return null;

  const value = decodeURIComponent(tokenCookie.split("=").slice(1).join("="));

  try {
    return JSON.parse(value) as FigmaOAuthTokens;
  } catch {
    return null;
  }
}

export function deleteTokenCookie(): string {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export function serializeStateCookie(state: FigmaOAuthState): string {
  const value = JSON.stringify(state);
  return [
    `${STATE_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=600", // 10 minutes
  ].join("; ");
}

export function parseStateCookie(cookieHeader: string | null): FigmaOAuthState | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const stateCookie = cookies.find((c) => c.startsWith(`${STATE_COOKIE_NAME}=`));

  if (!stateCookie) return null;

  const value = decodeURIComponent(stateCookie.split("=").slice(1).join("="));

  try {
    return JSON.parse(value) as FigmaOAuthState;
  } catch {
    return null;
  }
}

export function deleteStateCookie(): string {
  return [
    `${STATE_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export async function refreshFigmaToken(refreshToken: string): Promise<FigmaOAuthTokens> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Figma OAuth credentials not configured");
  }

  const response = await fetch("https://www.figma.com/api/oauth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma token refresh failed: ${errorText}`);
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

export async function getValidFigmaToken(
  cookieHeader: string | null
): Promise<string> {
  let tokens = parseTokenCookie(cookieHeader);

  if (!tokens) {
    throw new Error("Not authenticated with Figma. Please connect your Figma account.");
  }

  if (Date.now() >= tokens.expires_at - 60000) {
    tokens = await refreshFigmaToken(tokens.refresh_token);
  }

  return tokens.access_token;
}
