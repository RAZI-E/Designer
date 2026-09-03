import { NextRequest, NextResponse } from "next/server";
import { compileBlueprint } from "@/lib/compiler";
import type { SpecDocument } from "@/lib/types/spatial";

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

    const prompt = compileBlueprint(specDocument);

    return NextResponse.json({
      fullBlueprint: prompt.fullBlueprint,
      chunks: prompt.chunks,
      viewportSetup: prompt.viewportSetup,
      spatialMatrix: prompt.spatialMatrix,
      microEffects: prompt.microEffects,
      responsiveRules: prompt.responsiveRules,
      codeGenerationSteps: prompt.codeGenerationSteps,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalChunks: prompt.chunks.length,
        totalTokens: prompt.chunks.reduce((sum, c) => sum + c.tokenEstimate, 0),
      },
    });
  } catch (error) {
    console.error("Blueprint compilation error:", error);
    return NextResponse.json(
      { error: "Failed to compile blueprint" },
      { status: 500 }
    );
  }
}
