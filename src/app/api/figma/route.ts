import { NextRequest, NextResponse } from "next/server";
import { parseFigmaFile } from "@/lib/parsers/figma-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, token } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: "Figma file URL is required" },
        { status: 400 }
      );
    }

    const figmaToken = token || process.env.FIGMA_PERSONAL_ACCESS_TOKEN;
    if (!figmaToken) {
      return NextResponse.json(
        { error: "Figma Personal Access Token is required" },
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

    const response = await fetch(
      `https://api.figma.com/v1/files/${fileId}?geometry=paths`,
      {
        headers: {
          "X-Figma-Token": figmaToken,
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
      components: parsed.components,
      designTokens: parsed.designTokens,
      metadata: {
        fileName: figmaData.name,
        width: parsed.width,
        height: parsed.height,
        totalComponents: parsed.components.length,
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
