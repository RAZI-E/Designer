import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  extractionResponseSchema,
  buildExtractionPrompt,
  normalizeToDesktop,
} from "@/lib/gemini-spatial";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const imagePart = {
      inlineData: {
        mimeType: imageFile.type || "image/png",
        data: base64,
      },
    };

    const prompt = buildExtractionPrompt();

    // Prioritized list of Gemini vision models with automatic fallback
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ].filter(Boolean) as string[];

    let response: any = null;
    let lastError: any = null;
    let usedModel = "";

    for (const model of candidateModels) {
      try {
        response = await genAI.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [imagePart, { text: prompt }],
            },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: extractionResponseSchema,
          },
        });
        usedModel = model;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`Vision model ${model} failed, trying fallback:`, err instanceof Error ? err.message : err);
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to generate content with available Gemini models");
    }

    const raw = JSON.parse(response.text || '{"elements":[],"globalTokens":{"colors":{},"fonts":{},"shadows":[],"gradients":[]}}');

    let imgWidth = 1920;
    let imgHeight = 1080;

    const normalizedElements = normalizeToDesktop(raw.elements || [], imgWidth, imgHeight);

    return NextResponse.json({
      elements: normalizedElements,
      globalTokens: raw.globalTokens || { colors: {}, fonts: {}, shadows: [], gradients: [] },
      metadata: {
        canvasWidth: 1920,
        canvasHeight: 1080,
        sourceWidth: imgWidth,
        sourceHeight: imgHeight,
        extractedAt: new Date().toISOString(),
        elementCount: normalizedElements.length,
        modelUsed: usedModel,
      },
    });
  } catch (error) {
    console.error("Vision extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract spatial data" },
      { status: 500 }
    );
  }
}
