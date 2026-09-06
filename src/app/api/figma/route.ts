import { NextRequest, NextResponse } from "next/server";
import { parseFigmaFile } from "@/lib/parsers/figma-parser";
import { getValidFigmaToken } from "@/lib/figma/oauth";

// In-memory cache to prevent repeated Figma API calls and rate limiting (TTL 15 minutes)
const figmaFileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

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
        { error: "Invalid Figma URL format. Expected: https://www.figma.com/design/:fileKey/..." },
        { status: 400 }
      );
    }

    const fileId = fileIdMatch[1];

    // Extract specific node-id if present in URL (e.g., ?node-id=1-2 or ?node-id=1%3A2)
    const nodeIdMatch = fileUrl.match(/node-id=([a-zA-Z0-9%:-]+)/);
    const rawNodeId = nodeIdMatch ? decodeURIComponent(nodeIdMatch[1]).replace(/-/g, ":") : null;

    let accessToken = personalAccessToken;
    if (!accessToken) {
      try {
        accessToken = await getValidFigmaToken(request.headers.get("cookie"));
      } catch {
        return NextResponse.json(
          { error: "Not authenticated with Figma. Please connect your account or provide a Personal Access Token (PAT).", needsAuth: true },
          { status: 401 }
        );
      }
    }

    // Check cache
    const cacheKey = `${fileId}_${rawNodeId || "full"}_${accessToken.slice(-8)}`;
    const cached = figmaFileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const parsed = await parseFigmaFile(cached.data);
      return NextResponse.json({
        elements: parsed.elements,
        components: parsed.elements,
        globalTokens: parsed.globalTokens,
        designTokens: parsed.globalTokens,
        metadata: {
          fileName: cached.data.name || "Figma Design",
          width: parsed.width,
          height: parsed.height,
          totalComponents: parsed.elements.length,
          extractedAt: new Date(cached.timestamp).toISOString(),
          cached: true,
        },
      });
    }

    // Figma REST API headers
    const isPat = typeof accessToken === "string" && accessToken.startsWith("figd_");
    const headers: Record<string, string> = isPat
      ? { "X-Figma-Token": accessToken }
      : { "Authorization": `Bearer ${accessToken}` };

    // Use specific nodes endpoint if node-id is provided for 10x faster response and minimal rate limit impact
    const targetApiUrl = rawNodeId
      ? `https://api.figma.com/v1/files/${fileId}/nodes?ids=${encodeURIComponent(rawNodeId)}`
      : `https://api.figma.com/v1/files/${fileId}?depth=4`; // Avoid geometry=paths which causes instant rate limits

    const response = await fetch(targetApiUrl, { headers });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        return NextResponse.json(
          {
            error: `Figma API Rate Limit Exceeded. Please wait ${retryAfter} seconds before trying again, or use an Image/Screenshot with Gemini Vision instead.`,
            isRateLimited: true,
            retryAfterSeconds: parseInt(retryAfter, 10) || 60,
          },
          { status: 429 }
        );
      }
      const errorData = await response.json().catch(() => ({ err: response.statusText }));
      return NextResponse.json(
        { error: `Figma API error: ${errorData.err || errorData.message || response.statusText}` },
        { status: response.status }
      );
    }

    let figmaData = await response.json();

    // If fetched via nodes endpoint, normalize into standard FigmaFile structure
    if (rawNodeId && figmaData.nodes && figmaData.nodes[rawNodeId]) {
      const nodeWrapper = figmaData.nodes[rawNodeId];
      figmaData = {
        name: figmaData.name || nodeWrapper.document?.name || "Figma Node",
        document: nodeWrapper.document,
      };
    }

    // Cache the response
    figmaFileCache.set(cacheKey, { data: figmaData, timestamp: Date.now() });

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
