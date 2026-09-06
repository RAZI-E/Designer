import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const maxDuration = 60;

const designDeconstructionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.OBJECT,
      properties: {
        backgroundBaseHex: { type: Type.STRING, description: "Exact hex code of the base background" },
        hasGradient: { type: Type.BOOLEAN },
        gradientCss: { type: Type.STRING, description: "Exact CSS gradient or null if flat" },
        overlayTexture: { 
          type: Type.STRING, 
          description: "e.g., 'subtle grid 40px lines', 'noise texture', 'none'" 
        },
        primaryAccentHex: { type: Type.STRING },
        textPrimaryHex: { type: Type.STRING },
        textSecondaryHex: { type: Type.STRING },
      },
      required: ["backgroundBaseHex", "primaryAccentHex", "textPrimaryHex"],
    },
    typography: {
      type: Type.OBJECT,
      properties: {
        suggestedGoogleFontHeading: { type: Type.STRING, description: "Closest Google Font for headers (e.g., 'Syne', 'Space Grotesk', 'Cabinet Grotesk', 'Inter')" },
        suggestedGoogleFontBody: { type: Type.STRING },
        headerStyle: { 
          type: Type.STRING, 
          description: "e.g., 'extended wide grotesque, tracking-tighter, uppercase', 'serif editorial'" 
        },
      },
      required: ["suggestedGoogleFontHeading", "suggestedGoogleFontBody", "headerStyle"],
    },
    backgroundArtAndDecorations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "e.g., 'Large background watermark', '3D Orange Wireframe Blob'" },
          colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
          coordinates: { 
            type: Type.OBJECT, 
            properties: {
              top: { type: Type.STRING, description: "percentage or viewport unit, e.g., '12%'" },
              left: { type: Type.STRING },
              width: { type: Type.STRING },
              height: { type: Type.STRING },
              zIndex: { type: Type.INTEGER }
            },
            required: ["top", "left", "width", "height", "zIndex"]
          },
          renderingStrategy: { 
            type: Type.STRING, 
            description: "CRITICAL: How to reproduce it (e.g., 'Parametric SVG wireframe mesh with drop-shadow glow', 'Clipped text with 22vw font-size running offscreen', 'CSS Radial blur sphere')" 
          }
        },
        required: ["name", "colorPalette", "coordinates", "renderingStrategy"]
      }
    },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, description: "e.g., 'Navbar', 'Hero Headline', 'Inline Trigger List', 'Login Pill'" },
          morphology: { 
            type: Type.STRING, 
            description: "CRITICAL: Is it a boxed card? An inline text link with vertical divider ticks? A pill with a blurred background? A borderless row? Describe exact geometry." 
          },
          exactContent: { type: Type.STRING, description: "Verbatim text visible inside this component" },
          cssClassesTailwind: { type: Type.STRING, description: "Exact ready-to-paste Tailwind CSS classes to achieve this appearance" },
          placement: {
            type: Type.OBJECT,
            properties: {
              box: { type: Type.STRING, description: "[ymin, xmin, ymax, xmax] normalized from 0 to 1000" },
              alignment: { type: Type.STRING, description: "flex-row, flex-col, absolute, etc." }
            },
            required: ["box", "alignment"]
          }
        },
        required: ["id", "type", "morphology", "exactContent", "cssClassesTailwind", "placement"]
      }
    }
  },
  required: ["theme", "typography", "backgroundArtAndDecorations", "components"]
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as Blob | null;
    const imageUrl = formData.get('imageUrl') as string | null;

    let base64Data = "";
    let mimeType = "image/png";

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Data = buffer.toString('base64');
      mimeType = file.type || 'image/png';
    } else if (imageUrl) {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to fetch image from URL: ${res.statusText}`);
      const arrayBuf = await res.arrayBuffer();
      base64Data = Buffer.from(arrayBuf).toString('base64');
      mimeType = res.headers.get('content-type') || 'image/png';
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: `You are an elite Computer Vision Frontend Engineer. Deconstruct this design image into a high-precision architectural reproduction schema.
DO NOT summarize content or assume generic design defaults.
Pay intense attention to:
1. Exact visual nature of 3D objects, meshes, shapes, or background art (colors, glows, line density).
2. Button morphology: NEVER classify inline text links or divider-separated triggers as standard boxed buttons.
3. Giant typography running off-screen (watermarks, baseline cutoffs).
4. Subtle background gradients, grids, and ambient lighting.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: designDeconstructionSchema,
        temperature: 0.1, // Near-zero temperature to eliminate hallucinations
      }
    });

    const parsedAST = JSON.parse(response.text!);
    return NextResponse.json({ success: true, ast: parsedAST });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
