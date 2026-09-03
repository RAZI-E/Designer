import { NextRequest, NextResponse } from "next/server";
import { parseFigmaFile } from "@/lib/parsers/figma-parser";
import { getValidFigmaToken } from "@/lib/figma/oauth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl } = body;

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

    let accessToken: string;
    try {
      accessToken = await getValidFigmaToken(request.headers.get("cookie"));
    } catch {
      return NextResponse.json(
        { error: "Not authenticated with Figma. Please connect your account first.", needsAuth: true },
        { status: 401 }
      );
    }

    const response = await fetch(
      `https://api.figma.com/v1/files/${fileId}?geometry=paths`,
      {
        headers: {
          "X-Figma-Token": accessToken,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `Figma API error: ${errorData.err || response.statusText}` },
        { status: response.status }
      );
    }

    const figmaData = await response.json();
    const parsed = await parseFigmaFile(figmaData);

    return NextResponse.json({
      elements: parsed.elements,
      globalTokens: parsed.globalTokens,
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
      { error: "Failed to parse Figma file" },
      { status: 500 }
    );
  }
}
