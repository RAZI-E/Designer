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
    const imageUrl = formData.get("imageUrl") as string | null;

    let base64 = "";
    let mimeType = "image/png";

    if (imageFile) {
      const bytes = await imageFile.arrayBuffer();
      base64 = Buffer.from(bytes).toString("base64");
      mimeType = imageFile.type || "image/png";
    } else if (imageUrl) {
      try {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error(`Failed to fetch image from URL: ${imageRes.statusText}`);
        const arrayBuf = await imageRes.arrayBuffer();
        base64 = Buffer.from(arrayBuf).toString("base64");
        mimeType = imageRes.headers.get("content-type") || "image/png";
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to download image from URL" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Image file or Image URL is required" },
        { status: 400 }
      );
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64,
      },
    };

    const prompt = buildExtractionPrompt();

    // Prioritized list of Gemini vision models with automatic fallback
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.7-flash",
      "gemini-3.7-pro",
      "gemini-3.5-flash",
      "gemini-2.5-flash",
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

    const imgWidth = 1920;
    const imgHeight = 1080;

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
      { error: error instanceof Error ? error.message : "Failed to extract spatial data from screenshot" },
      { status: 500 }
    );
  }
}
