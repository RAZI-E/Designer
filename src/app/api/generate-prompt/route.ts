import { NextRequest, NextResponse } from "next/server";
import { generatePrompt } from "@/lib/generator/prompt-generator";
import type { SpecDocument } from "@/lib/types/spec-dsl";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { specDocument } = body as { specDocument: SpecDocument };

    if (!specDocument) {
      return NextResponse.json(
        { error: "SpecDocument is required" },
        { status: 400 }
      );
    }

    const prompt = generatePrompt(specDocument);

    return NextResponse.json({
      systemPrompt: prompt.systemPrompt,
      chunks: prompt.chunks,
      fullMarkdown: prompt.fullMarkdown,
      cursorRules: prompt.cursorRules,
      designTokensMarkdown: prompt.designTokensMarkdown,
      componentGuide: prompt.componentGuide,
      fileTreeMarkdown: prompt.fileTreeMarkdown,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalChunks: prompt.chunks.length,
        totalTokens: prompt.chunks.reduce((sum, c) => sum + c.tokenEstimate, 0),
      },
    });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate prompt" },
      { status: 500 }
    );
  }
}
