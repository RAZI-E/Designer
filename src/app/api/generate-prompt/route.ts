import { NextRequest, NextResponse } from "next/server";
import { compileBlueprint, compileBlueprintToMarkdown } from "@/lib/compiler";
import type { SpecDocument } from "@/lib/types/spatial";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { specDocument, ast } = body as { specDocument?: SpecDocument; ast?: any };

    if (ast) {
      const fullBlueprint = compileBlueprintToMarkdown(ast);
      return NextResponse.json({
        fullBlueprint,
        ast,
        viewportSetup: `# Global Tokens & Canvas Setup\n- Background: ${ast.theme?.backgroundBaseHex}\n- Font: ${ast.typography?.suggestedGoogleFontHeading}\n- Primary Accent: ${ast.theme?.primaryAccentHex}`,
        spatialMatrix: `# Component Matrix\n` + (ast.components || []).map((c: any) => `- [${c.type}] (${c.morphology}): "${c.exactContent}" -> ${c.cssClassesTailwind}`).join("\n"),
        microEffects: `# Background Art & Shaders\n` + (ast.backgroundArtAndDecorations || []).map((b: any) => `- ${b.name}: ${b.renderingStrategy} (Colors: ${b.colorPalette?.join(", ")})`).join("\n"),
        responsiveRules: `# Strict Execution Guardrails\n1. ZERO INVENTED STYLES\n2. MORPHOLOGY ADHERENCE\n3. ART & ASSET ACCURACY\n4. EXACT COPY PRESERVATION`,
        codeGenerationSteps: fullBlueprint,
        chunks: [
          {
            title: "Verbatim Execution Blueprint",
            content: fullBlueprint,
            tokenEstimate: Math.ceil(fullBlueprint.length / 4),
          }
        ],
        metadata: {
          generatedAt: new Date().toISOString(),
          totalChunks: 1,
          totalTokens: Math.ceil(fullBlueprint.length / 4),
        },
      });
    }

    if (!specDocument) {
      return NextResponse.json(
        { error: "SpecDocument or AST is required" },
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
