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

// The generated test image
const imgPath = 'C:/Users/razim/.gemini/antigravity-ide/brain/5cf6236f-5251-4ed1-9b97-f6b786165ac4/saas_landing_page_1789374781404.jpg';
const imgBuf = fs.readFileSync(imgPath);
const base64Data = imgBuf.toString('base64');

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

async function testPromptGeneration() {
  console.log('Sending SaaS landing page image to Gemini Vision API...');
  const res = await ai.models.generateContent({
    model: env.GEMINI_MODEL || 'gemini-3.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
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

  const ast = JSON.parse(res.text);
  console.log('--- EXTRACTED AST ---');
  console.log(JSON.stringify(ast, null, 2));

  // Now compile to markdown using the app's compiler logic
  const { theme, typography, backgroundArtAndDecorations, components } = ast || {};
  const blueprint = `# High-Precision Execution Blueprint (Verbatim Rebuild)

## CRITICAL EXECUTION RULES (STRICT ENFORCEMENT)
1. ZERO INVENTED STYLES: Do NOT use default component libraries (Shadcn/Bootstrap/Tailwind defaults) unless they match the exact classes specified below.
2. MORPHOLOGY ADHERENCE: If an item is an "Inline Trigger List", DO NOT wrap it in a card or button box. Keep it borderless with vertical tick dividers as specified.
3. ART & ASSET ACCURACY: Reconstruct decorative assets (3D meshes, spheres, gradients) using the exact colors and SVG/CSS strategies defined in Section 2. Do not substitute with gray wireframe spheres or stock icons.
4. TEXT CUTOFFS & WATERMARKS: Watermark elements must retain their huge scale and baseline viewport clipping.

---

## 1. Global Setup & Design Tokens

### Fonts:
Add these to \`app/layout.tsx\` or your global stylesheet:
- **Heading Font:** \`${typography?.suggestedGoogleFontHeading || "Inter"}\` (\`${typography?.headerStyle || "normal"}\`)
- **Body Font:** \`${typography?.suggestedGoogleFontBody || "Inter"}\`

### Canvas & Theme Tokens:
- **Background Base:** \`${theme?.backgroundBaseHex || "#000000"}\`
${theme?.hasGradient ? `- **Background Gradient:** \`${theme.gradientCss}\`` : ""}
${theme?.overlayTexture && theme.overlayTexture !== "none" ? `- **Overlay Texture/Pattern:** \`${theme.overlayTexture}\`` : ""}
- **Primary Accent:** \`${theme?.primaryAccentHex || "#3b82f6"}\`
- **Text Primary:** \`${theme?.textPrimaryHex || "#ffffff"}\`
- **Text Secondary:** \`${theme?.textSecondaryHex || "#a1a1aa"}\`

---

## 2. Background Art, 3D Assets & Ambient Layers
${(backgroundArtAndDecorations || []).map((art, i) => `
### Layer ${i + 1}: ${art.name}
- **Colors:** ${(art.colorPalette || []).join(", ")}
- **Positioning:** \`top: ${art.coordinates?.top}\`, \`left: ${art.coordinates?.left}\`, \`width: ${art.coordinates?.width}\`, \`height: ${art.coordinates?.height}\`, \`z-index: ${art.coordinates?.zIndex}\`
- **Rendering Strategy:** ${art.renderingStrategy}
`).join("\n")}

---

## 3. Component Matrix & Exact Morphologies

| Component | Target Morphology | Exact Visible Copy | Recommended Tailwind Classes |
| :--- | :--- | :--- | :--- |
${(components || []).map((c) => `| **${c.type}** | ${c.morphology} | \`${(c.exactContent || "").replace(/\n/g, " ")}\` | \`${c.cssClassesTailwind}\` |`).join("\n")}

---

## 4. Layout Assembly Instructions

Follow this structural assembly order in your main page component:

\`\`\`tsx
export default function Page() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: '${theme?.backgroundBaseHex || "#000000"}' }}>
      {/* 1. Background Layers & Art */}
      ${(backgroundArtAndDecorations || []).map((art) => `
      {/* ${art.name} */}
      <div 
        className="pointer-events-none absolute"
        style={{
          top: '${art.coordinates?.top}',
          left: '${art.coordinates?.left}',
          width: '${art.coordinates?.width}',
          height: '${art.coordinates?.height}',
          zIndex: ${art.coordinates?.zIndex},
        }}
      >
        {/* Render: ${art.renderingStrategy} */}
      </div>`).join("\n")}

      {/* 2. Primary UI Components */}
      <div className="relative z-20 flex flex-col min-h-screen">
        {/* Inject Header, Hero, and Triggers here using the exact Tailwind classes defined in Section 3 */}
      </div>
    </main>
  );
}
\`\`\`

---

## 5. Verification Checklist for Agent
Before concluding your response:
- [ ] Confirm typography imports match \`${typography?.suggestedGoogleFontHeading || "Inter"}\`.
- [ ] Ensure all action triggers match their specific morphology (no unwanted borders or boxed card wrappers).
- [ ] Verify that background art elements use their exact specified colors (${theme?.primaryAccentHex || "#3b82f6"}) rather than monochromatic placeholders.
`;

  console.log('\n================ GENERATED PROMPT BLUEPRINT ================\n');
  console.log(blueprint);

  fs.writeFileSync('C:/Users/razim/.gemini/antigravity-ide/brain/5cf6236f-5251-4ed1-9b97-f6b786165ac4/scratch/saas_output.md', blueprint);
}

testPromptGeneration();
