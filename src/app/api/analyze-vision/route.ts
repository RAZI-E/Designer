import { GoogleGenAI, Type, Schema } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { repairJson } from '@/lib/json-repair';

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
        suggestedGoogleFontHeading: { type: Type.STRING, description: "Closest Google Font for headers (e.g., 'Playfair Display', 'Syne', 'Space Grotesk', 'Cabinet Grotesk', 'Inter')" },
        suggestedGoogleFontBody: { type: Type.STRING },
        headerStyle: { 
          type: Type.STRING, 
          description: "e.g., 'extended wide grotesque, tracking-tighter, uppercase', 'serif editorial, high-contrast, uppercase'" 
        },
      },
      required: ["suggestedGoogleFontHeading", "suggestedGoogleFontBody", "headerStyle"],
    },
    mediaAssets: {
      type: Type.ARRAY,
      description: "MANDATORY: Detect every image, 3D render, video embed, user avatar photo, hero illustration, or product mockup in the design.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { 
            type: Type.STRING, 
            description: "image, video, avatar, mockup, 3d_render, illustration, or icon" 
          },
          title: { type: Type.STRING, description: "Descriptive label, e.g., '3D Mountain Landscape Hero Banner', 'Author Avatar - Léo Parpeix'" },
          location: { type: Type.STRING, description: "Where it is located in the UI, e.g., 'Hero bottom full width', 'Creator trigger row'" },
          aspectRatio: { type: Type.STRING, description: "e.g., '16:9', '1:1', '21:9', '4:3', 'auto'" },
          suggestedFilename: { type: Type.STRING, description: "e.g., 'hero-landscape.png', 'avatar-leo.png'" },
          questionForUser: { type: Type.STRING, description: "Direct question to ask the user, e.g., 'Do you have the 3D Mountain Landscape image file, or should the IDE ask you to provide it during generation?'" },
          cssClassesTailwind: { type: Type.STRING, description: "Container styling and image sizing Tailwind classes" },
        },
        required: ["id", "type", "title", "location", "suggestedFilename", "questionForUser", "cssClassesTailwind"],
      },
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
          type: { type: Type.STRING, description: "e.g., 'Navbar', 'Hero Headline', 'Inline Trigger List', 'Login Pill', 'Search Input'" },
          morphology: { 
            type: Type.STRING, 
            description: "CRITICAL: Is it a boxed card? An inline text link with vertical divider ticks? A pill with a blurred background? A borderless row? Describe exact geometry." 
          },
          exactContent: { type: Type.STRING, description: "Verbatim text visible inside this component" },
          cssClassesTailwind: { type: Type.STRING, description: "Exact ready-to-paste Tailwind CSS classes to achieve this appearance" },
          subElements: {
            type: Type.ARRAY,
            description: "MANDATORY FOR COMPOUND COMPONENTS: Break down navbars into Logo, Nav Items (with badges), Search Bar, and Action Buttons; break down trigger rows into Avatar, Name, and Badge.",
            items: {
              type: Type.OBJECT,
              properties: {
                role: { type: Type.STRING, description: "e.g., 'logo', 'nav_link', 'search_input', 'badge', 'avatar', 'button', 'text'" },
                content: { type: Type.STRING, description: "Visible text, placeholder, or asset reference" },
                cssClassesTailwind: { type: Type.STRING, description: "Tailwind CSS classes for this specific sub-element" },
              },
              required: ["role", "content", "cssClassesTailwind"],
            },
          },
          placement: {
            type: Type.OBJECT,
            properties: {
              box: { type: Type.STRING, description: "[ymin, xmin, ymax, xmax] normalized from 0 to 1000 or region name" },
              alignment: { type: Type.STRING, description: "flex-row, flex-col, absolute, etc." }
            },
            required: ["box", "alignment"]
          }
        },
        required: ["id", "type", "morphology", "exactContent", "cssClassesTailwind", "placement"]
      }
    },
    layoutStructure: {
      type: Type.OBJECT,
      description: "Overall page layout hierarchy and section order for generating executable React/Next.js JSX",
      properties: {
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "e.g., 'Navbar Header', 'Hero Content', 'Media Showcase Banner', 'Footer'" },
              tag: { type: Type.STRING, description: "nav, header, main, section, div, footer" },
              containerClassesTailwind: { type: Type.STRING, description: "Container layout classes, e.g. 'w-full max-w-7xl mx-auto px-6 py-12 flex flex-col items-center'" },
              componentIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "tag", "containerClassesTailwind", "componentIds"]
          }
        }
      },
      required: ["sections"]
    }
  },
  required: ["theme", "typography", "backgroundArtAndDecorations", "components", "mediaAssets", "layoutStructure"]
};

function isTransientError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code;
  if (status === 503 || status === 429 || status === 504 || status === 500) return true;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('spikes in demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('try again later') ||
    msg.includes('temporarily') ||
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveImageBuffer(
  file: Blob | null,
  imageUrl: string | null
): Promise<{ base64Data: string; mimeType: string }> {
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      base64Data: buffer.toString('base64'),
      mimeType: file.type || 'image/png',
    };
  }

  if (imageUrl) {
    let clean = imageUrl.trim();

    // 1. Data URL
    if (clean.startsWith('data:image/')) {
      const match = clean.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64Data: match[2] };
      }
    }

    // 2. Local file path support
    let localPath = clean;
    if (localPath.startsWith('file:///')) {
      localPath = decodeURIComponent(localPath.replace(/^file:\/\/\//, ''));
    }
    if (/^[a-zA-Z]:[\\\/]/.test(localPath) || localPath.startsWith('/') || localPath.startsWith('\\')) {
      if (fs.existsSync(localPath)) {
        const buf = await fs.promises.readFile(localPath);
        const ext = localPath.split('.').pop()?.toLowerCase();
        let mimeType = 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        return { mimeType, base64Data: buf.toString('base64') };
      } else {
        throw new Error(`Local file not found: ${localPath}`);
      }
    }

    // 3. Remote URL
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }

    let res: Response;
    try {
      res = await fetch(clean, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        },
      });
    } catch (fetchErr: any) {
      throw new Error(`Failed to connect to URL (${clean}): ${fetchErr.message || fetchErr}`);
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch URL (${res.status} ${res.statusText}): ${clean}`);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    // If it's directly an image
    if (contentType.startsWith('image/')) {
      const arrayBuf = await res.arrayBuffer();
      return {
        mimeType: contentType.split(';')[0],
        base64Data: Buffer.from(arrayBuf).toString('base64'),
      };
    }

    // If it's a website/webpage (HTML), automatically capture a high-res screenshot of the live site!
    const mShotsUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(clean)}?w=1920&h=1080`;
    try {
      const shotRes = await fetch(mShotsUrl);
      if (shotRes.ok && (shotRes.headers.get('content-type') || '').startsWith('image/')) {
        const shotBuf = await shotRes.arrayBuffer();
        return {
          mimeType: 'image/jpeg',
          base64Data: Buffer.from(shotBuf).toString('base64'),
        };
      }
    } catch {
      // try fallback below
    }

    // Fallback screenshot service
    const thumUrl = `https://image.thum.io/get/width/1920/crop/1080/noanimate/${encodeURIComponent(clean)}`;
    const thumRes = await fetch(thumUrl);
    if (thumRes.ok) {
      const thumBuf = await thumRes.arrayBuffer();
      return {
        mimeType: 'image/png',
        base64Data: Buffer.from(thumBuf).toString('base64'),
      };
    }

    throw new Error(`The provided URL (${clean}) is a webpage, but screenshot capture failed. Please upload a screenshot directly or try another URL.`);
  }

  throw new Error('No image or URL provided');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as Blob | null;
    const imageUrl = formData.get('imageUrl') as string | null;

    const { base64Data, mimeType } = await resolveImageBuffer(file, imageUrl);

    // Active, verified vision-capable Gemini models in order of preference
    const rawCandidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
    ].filter(Boolean) as string[];

    const candidateModels = Array.from(new Set(rawCandidateModels));

    let response: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      const maxRetries = 2;
      let attempt = 0;
      let modelSucceeded = false;

      while (attempt <= maxRetries) {
        try {
          response = await ai.models.generateContent({
            model,
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
                    text: `You are an elite Computer Vision Frontend Engineer and UI Systems Architect. Deconstruct this design image into a high-precision architectural reproduction schema.
DO NOT summarize content or assume generic design defaults.
Be structured, concise, and focused. Limit deconstruction to the visible viewport components (8-12 primary components max) and direct sub-elements. Do not generate verbose runaway paragraphs.
Pay intense attention to:
1. MEDIA ASSETS (CRITICAL): Detect EVERY image, 3D render, avatar profile picture, hero landscape, video player, or mockup in the design. Detail its location, aspect ratio, suggested filename, and formulate a clear question for the user (e.g., whether they have the asset or the IDE should prompt them).
2. COMPOUND COMPONENT DECONSTRUCTION: NEVER output a Navbar or complex card as a single unparsed string. Break Navbars into: Logo, individual Nav items (with any 'New' pill badges), Search Input box with placeholder, and Action buttons. Break Author rows into: Avatar image, Author Name, and Badge.
3. BUTTON & TRIGGER MORPHOLOGY: Distinguish between pill buttons, boxed cards, outline buttons, and inline divider-separated triggers.
4. TYPOGRAPHY & SERIF ACCURACY: Identify exact font styles (e.g. editorial high-contrast serif, massive viewport-width text sizes like text-[7.5vw], font-bold, uppercase, tracking-tight).
5. LAYOUT STRUCTURE: Define the top-down section order (Navbar, Hero Headline, Sub-triggers, Media Banner Showcase, Footer) with ready-to-render container Tailwind classes.`
                  }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: designDeconstructionSchema,
              temperature: 0.1, // Near-zero temperature to eliminate hallucinations
              maxOutputTokens: 8192,
            }
          });

          if (response && response.text) {
            modelSucceeded = true;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isTransient = isTransientError(err);
          console.warn(`Model ${model} (attempt ${attempt + 1}/${maxRetries + 1}) failed:`, err instanceof Error ? err.message : err);

          if (isTransient && attempt < maxRetries) {
            // Exponential backoff with random jitter: 800ms, 1600ms + [0-400ms]
            const delay = Math.pow(2, attempt) * 800 + Math.random() * 400;
            console.log(`Transient high demand on ${model}. Retrying in ${Math.round(delay)}ms...`);
            await sleep(delay);
            attempt++;
          } else {
            // Model either permanently failed (e.g. 404) or exhausted retries: cascade to next fallback model
            break;
          }
        }
      }

      if (modelSucceeded) {
        break;
      }
    }

    if (!response || !response.text) {
      const isDemandError = isTransientError(lastError);
      const statusCode = isDemandError ? 503 : 500;
      const userMessage = isDemandError
        ? "AI vision models are currently experiencing high global demand. Automatic failover and retries were attempted. Please try again in a few seconds."
        : (lastError instanceof Error ? lastError.message : 'Failed to analyze image with available Gemini models');

      return NextResponse.json(
        { 
          error: userMessage,
          isTransient: isDemandError,
        },
        { status: statusCode }
      );
    }

    const parsedAST = repairJson(response.text);
    return NextResponse.json({ success: true, ast: parsedAST });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    const isDemandError = isTransientError(error);
    const userMessage = isDemandError
      ? "AI vision models are currently experiencing high global demand. Please try again in a moment."
      : (error instanceof Error ? error.message : "Internal server error");

    return NextResponse.json(
      { 
        error: userMessage,
        isTransient: isDemandError 
      }, 
      { status: isDemandError ? 503 : 500 }
    );
  }
}
