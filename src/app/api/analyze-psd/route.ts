import { NextRequest, NextResponse } from "next/server";
import { parsePSD } from "@/lib/parsers/psd-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "PSD file is required" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const result = await parsePSD(buffer);

    return NextResponse.json({
      elements: result.elements,
      components: result.elements,
      globalTokens: result.globalTokens,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        width: result.width,
        height: result.height,
        totalComponents: result.totalElements,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("PSD parsing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse PSD file" },
      { status: 500 }
    );
  }
}
