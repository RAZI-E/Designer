import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';

// Read .env
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim();
});

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Read logo.png as test image
const imgBuf = fs.readFileSync('public/logo.png');
const base64Data = imgBuf.toString('base64');

console.log('Testing image analysis with public/logo.png...');

const designDeconstructionSchema = {
  type: Type.OBJECT,
  properties: {
    theme: {
      type: Type.OBJECT,
      properties: {
        backgroundBaseHex: { type: Type.STRING },
        hasGradient: { type: Type.BOOLEAN },
        gradientCss: { type: Type.STRING },
        overlayTexture: { type: Type.STRING },
        primaryAccentHex: { type: Type.STRING },
        textPrimaryHex: { type: Type.STRING },
        textSecondaryHex: { type: Type.STRING },
      },
      required: ["backgroundBaseHex", "primaryAccentHex", "textPrimaryHex"],
    },
    typography: {
      type: Type.OBJECT,
      properties: {
        suggestedGoogleFontHeading: { type: Type.STRING },
        suggestedGoogleFontBody: { type: Type.STRING },
        headerStyle: { type: Type.STRING },
      },
      required: ["suggestedGoogleFontHeading", "suggestedGoogleFontBody", "headerStyle"],
    },
    backgroundArtAndDecorations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
          coordinates: { 
            type: Type.OBJECT, 
            properties: {
              top: { type: Type.STRING },
              left: { type: Type.STRING },
              width: { type: Type.STRING },
              height: { type: Type.STRING },
              zIndex: { type: Type.INTEGER }
            },
            required: ["top", "left", "width", "height", "zIndex"]
          },
          renderingStrategy: { type: Type.STRING }
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
          type: { type: Type.STRING },
          morphology: { type: Type.STRING },
          exactContent: { type: Type.STRING },
          cssClassesTailwind: { type: Type.STRING },
          placement: {
            type: Type.OBJECT,
            properties: {
              box: { type: Type.STRING },
              alignment: { type: Type.STRING }
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

async function test() {
  try {
    const res = await ai.models.generateContent({
      model: env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/png',
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
        temperature: 0.1,
      }
    });

    console.log('Response text length:', res.text?.length);
    const ast = JSON.parse(res.text);
    console.log('AST extracted:', JSON.stringify(ast, null, 2).slice(0, 500) + '...');
  } catch (err) {
    console.error('Vision test error:', err);
  }
}

test();
