import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const detectionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      label: { type: "string" },
      category: {
        type: "string",
        enum: [
          "Navbar",
          "Hero",
          "Card",
          "Button",
          "Form",
          "Modal",
          "Footer",
          "Sidebar",
          "Input",
          "Badge",
          "Avatar",
          "Table",
          "List",
          "Grid",
          "Section",
          "Container",
          "Text",
          "Image",
          "Icon",
          "Divider",
          "Unknown",
        ],
      },
      bbox: {
        type: "array",
        items: { type: "number" },
        minItems: 4,
        maxItems: 4,
      },
      confidence: { type: "number" },
      styles: {
        type: "object",
        properties: {
          backgroundColor: { type: "string" },
          textColor: { type: "string" },
          borderColor: { type: "string" },
          borderRadius: { type: "number" },
          fontSize: { type: "number" },
          fontWeight: { type: "number" },
          padding: {
            type: "object",
            properties: {
              top: { type: "number" },
              right: { type: "number" },
              bottom: { type: "number" },
              left: { type: "number" },
            },
          },
          gap: { type: "number" },
          flexDirection: { type: "string", enum: ["row", "column"] },
        },
      },
      text: { type: "string" },
    },
    required: ["label", "category", "bbox", "confidence"],
  },
};

const designTokenSchema = {
  type: "object",
  properties: {
    colors: {
      type: "array",
      items: { type: "string" },
    },
    fonts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          family: { type: "string" },
          size: { type: "number" },
          weight: { type: "number" },
        },
      },
    },
    spacing: {
      type: "array",
      items: { type: "number" },
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;

    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: "Either image file or imageUrl is required" },
        { status: 400 }
      );
    }

    let imagePart: { inlineData: { mimeType: string; data: string } };

    if (imageFile) {
      const bytes = await imageFile.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      imagePart = {
        inlineData: {
          mimeType: imageFile.type || "image/png",
          data: base64,
        },
      };
    } else {
      imagePart = {
        inlineData: {
          mimeType: "image/png",
          data: "",
        },
      };
    }

    const prompt = `Analyze this UI design image and extract all visible components with their exact bounding boxes, spatial relationships, and design tokens.

For each component detected, provide:
1. A descriptive label (e.g., "Navigation Bar", "Hero Section", "Login Button")
2. A category from the allowed list
3. Bounding box as [x1, y1, x2, y2] in pixels (top-left and bottom-right corners)
4. Confidence score (0-1)
5. Detected styles (colors, fonts, spacing, border-radius)

Also extract:
- All unique colors found in the design (as hex strings)
- Typography information (font family, sizes, weights)
- Common spacing values used

Be as precise as possible with the bounding boxes. Include ALL visible components, even small ones like icons, badges, and dividers.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            imagePart,
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: detectionSchema,
      },
    });

    const detections = JSON.parse(response.text || "[]");

    const tokenResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            imagePart,
            { text: "Extract all unique design tokens from this image: colors (hex), typography (font families, sizes, weights), and spacing values. Return as JSON." },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: designTokenSchema,
      },
    });

    const designTokens = JSON.parse(tokenResponse.text || "{}");

    return NextResponse.json({
      detections,
      designTokens,
      metadata: {
        processedAt: new Date().toISOString(),
        totalDetections: detections.length,
      },
    });
  } catch (error) {
    console.error("Vision analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
