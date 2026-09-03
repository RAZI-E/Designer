import { NextRequest, NextResponse } from "next/server";
import { parseFigmaFile } from "@/lib/parsers/figma-parser";
import { getValidFigmaToken } from "@/lib/figma/oauth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, personalAccessToken } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Figma file URL is required" },
        { status: 400 }
      );
    }

    const fileIdMatch = fileUrl.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
    if (!fileIdMatch) {
      return NextResponse.json(
        { error: "Invalid Figma URL format" },
        { status: 400 }
      );
    }

    const fileId = fileIdMatch[1];

    let accessToken = personalAccessToken;
    if (!accessToken) {
      try {
        accessToken = await getValidFigmaToken(request.headers.get("cookie"));
      } catch {
        return NextResponse.json(
          { error: "Not authenticated with Figma. Please connect your account first.", needsAuth: true },
          { status: 401 }
        );
      }
    }

    // Figma REST API requires 'Authorization: Bearer <token>' for OAuth 2.0 access tokens,
    // and 'X-Figma-Token: <token>' for Personal Access Tokens (which start with 'figd_').
    const isPat = typeof accessToken === "string" && accessToken.startsWith("figd_");
    const headers: Record<string, string> = isPat
      ? { "X-Figma-Token": accessToken }
      : { "Authorization": `Bearer ${accessToken}` };

    const response = await fetch(
      `https://api.figma.com/v1/files/${fileId}?geometry=paths`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ err: response.statusText }));
      return NextResponse.json(
        { error: `Figma API error: ${errorData.err || errorData.message || response.statusText}` },
        { status: response.status }
      );
    }

    const figmaData = await response.json();
    const parsed = await parseFigmaFile(figmaData);

    return NextResponse.json({
      elements: parsed.elements,
      components: parsed.elements, // backwards compatibility alias
      globalTokens: parsed.globalTokens,
      designTokens: parsed.globalTokens, // backwards compatibility alias
      metadata: {
        fileName: figmaData.name,
        width: parsed.width,
        height: parsed.height,
        totalComponents: parsed.elements.length,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Figma parsing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse Figma file" },
      { status: 500 }
    );
  }
}
