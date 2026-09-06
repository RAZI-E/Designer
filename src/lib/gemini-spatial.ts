import type { ElementSpatialNode, DesignExtractionResult } from "@/lib/types/spatial";

export const DESKTOP_REFERENCE = { width: 1920, height: 1080 } as const;
export const MOBILE_REFERENCE = { width: 390, height: 844 } as const;

export const elementSpatialSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    semanticTag: {
      type: "string",
      enum: ["nav", "header", "main", "section", "article", "aside", "footer", "div", "button", "input", "a"],
    },
    textContent: { type: "string" },
    componentType: { type: "string" },
    layout: {
      type: "object",
      properties: {
        desktop_16_9: {
          type: "object",
          properties: {
            positionMode: { type: "string", enum: ["fixed", "absolute", "flex", "grid", "sticky"] },
            coordinates: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
              },
              required: ["x", "y", "width", "height"],
            },
            viewportPercentage: {
              type: "object",
              properties: {
                top: { type: "string" },
                left: { type: "string" },
                width: { type: "string" },
                height: { type: "string" },
              },
              required: ["top", "left", "width", "height"],
            },
            margin: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
            padding: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
            gap: { type: "number" },
            alignment: {
              type: "object",
              properties: { justify: { type: "string" }, align: { type: "string" } },
              required: ["justify", "align"],
            },
            zIndex: { type: "number" },
          },
          required: ["positionMode", "coordinates", "viewportPercentage", "margin", "padding", "alignment"],
        },
        mobile_9_16: {
          type: "object",
          properties: {
            positionMode: { type: "string", enum: ["fixed", "absolute", "flex", "grid", "sticky"] },
            stackDirection: { type: "string", enum: ["row", "col"] },
            margin: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
            padding: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
            gap: { type: "number" },
            visibility: { type: "string", enum: ["visible", "hidden", "drawer", "accordion"] },
          },
          required: ["positionMode", "stackDirection", "margin", "padding", "visibility"],
        },
      },
      required: ["desktop_16_9"],
    },
    styling: {
      type: "object",
      properties: {
        backgroundColor: { type: "string" },
        borderRadius: {
          type: "object",
          properties: {
            topLeft: { type: "number" },
            topRight: { type: "number" },
            bottomRight: { type: "number" },
            bottomLeft: { type: "number" },
            tailwindEquivalent: { type: "string" },
          },
          required: ["topLeft", "topRight", "bottomRight", "bottomLeft", "tailwindEquivalent"],
        },
        border: {
          type: "object",
          properties: {
            width: { type: "number" },
            style: { type: "string", enum: ["solid", "dashed", "none"] },
            color: { type: "string" },
          },
          required: ["width", "style", "color"],
        },
        effects: {
          type: "object",
          properties: {
            boxShadow: { type: "string" },
            innerGlow: { type: "string" },
            textGlow: { type: "string" },
            glow: {
              type: "object",
              properties: {
                spread: { type: "number" },
                blur: { type: "number" },
                color: { type: "string" },
                tailwindClass: { type: "string" },
              },
              required: ["spread", "blur", "color", "tailwindClass"],
            },
            backdropBlur: { type: "string" },
            glassmorphism: {
              type: "object",
              properties: {
                backdropBlur: { type: "string" },
                borderColor: { type: "string" },
                backgroundColor: { type: "string" },
              },
            },
            opacity: { type: "number" },
          },
          required: ["opacity"],
        },
        typography: {
          type: "object",
          properties: {
            fontFamily: { type: "string" },
            fontSizePx: { type: "number" },
            fontWeight: { type: "number" },
            lineHeightPx: { type: "number" },
            letterSpacing: { type: "string" },
            color: { type: "string" },
            textTransform: { type: "string", enum: ["uppercase", "lowercase", "capitalize", "none"] },
          },
          required: ["fontFamily", "fontSizePx", "fontWeight", "lineHeightPx", "letterSpacing", "color"],
        },
      },
      required: ["backgroundColor", "borderRadius", "border", "effects"],
    },
    interactions: {
      type: "object",
      properties: {
        hoverEffect: {
          type: "object",
          properties: {
            transform: { type: "string" },
            backgroundColor: { type: "string" },
            glow: { type: "string" },
            elevation: { type: "string" },
            cursor: { type: "string", enum: ["pointer", "default"] },
            transitionDurationMs: { type: "number" },
          },
          required: ["cursor", "transitionDurationMs"],
        },
        activeClickEffect: {
          type: "object",
          properties: {
            transform: { type: "string" },
            ring: { type: "string" },
          },
        },
        focusVisible: { type: "string" },
      },
    },
    children: {
      type: "array",
      items: { type: "object" },
    },
  },
  required: ["id", "name", "semanticTag", "layout", "styling", "interactions"],
};

export const extractionResponseSchema = {
  type: "object",
  properties: {
    elements: {
      type: "array",
      items: elementSpatialSchema,
    },
    globalTokens: {
      type: "object",
      properties: {
        themeMode: { type: "string", enum: ["dark", "light"] },
        canvasBackground: { type: "string" },
        colors: { type: "object" },
        fonts: { type: "object" },
        shadows: { type: "array", items: { type: "string" } },
        gradients: { type: "array", items: { type: "string" } },
        gridShader: {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            intervalPx: { type: "number" },
            lineColor: { type: "string" },
            lineOpacity: { type: "number" },
            cssPattern: { type: "string" },
          },
        },
        ambientLayers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["glow_orb", "wireframe_sphere", "mesh_gradient", "custom"] },
              description: { type: "string" },
              coordinates: {
                type: "object",
                properties: {
                  x: { type: "string" },
                  y: { type: "string" },
                  width: { type: "string" },
                  height: { type: "string" },
                },
                required: ["x", "y", "width", "height"],
              },
              effect: { type: "string" },
              color: { type: "string" },
            },
            required: ["type", "description", "coordinates", "effect", "color"],
          },
        },
      },
      required: ["colors", "fonts", "shadows", "gradients"],
    },
  },
  required: ["elements", "globalTokens"],
};

export function buildExtractionPrompt(): string {
  return `You are a Principal Computer Vision Spatial Engineer and Senior UI Systems Architect specializing in Pixel-Accurate Geometric and Shader Reconstruction.

Analyze this design image and perform a complete mathematical, spatial, color-space, and shader extraction. You MUST NOT summarize content (e.g. do not just say "A header with login button"). You must execute an exhaustive, pixel-accurate geometric decomposition.

### Mandatory Extraction Protocol:

1. **Strict Geometric AST & Layout Hierarchy:**
   - Detect every single container, navbar, button, badge, input, heading, subheader, card, and layout section.
   - For every node, calculate exact coordinates (x, y, width, height) relative to the 1920x1080 canvas.
   - Calculate viewport percentages (top%, left%, width%, height%), exact padding [T,R,B,L], margin [T,R,B,L], and gap between children.
   - Map alignment (justify, align) and positionMode ("flex", "grid", "fixed", "absolute", "sticky").

2. **Color Space & Global Theme Mapping:**
   - Extract the exact canvas/page background color (e.g., deep dark theme \`#0F172A\` or \`#09090B\`, or light theme).
   - Set \`themeMode\` to "dark" or "light".
   - Extract the full color palette into semantic tokens (e.g., background, primary glow, secondary accent, border, muted text, foreground).

3. **Shaders, Shaders Patterns & Ambient Background Layers:**
   - **Background Grid Shader:** If grid lines / dot matrices are visible in the background, extract \`gridShader\` with intervalPx (e.g., 40), lineColor (e.g., \`#1E293B\` or \`rgba(255,255,255,0.03)\`), and the exact CSS linear-gradient pattern.
   - **Ambient Glow Orbs & Wireframes:** If ambient 3D spheres, wireframe meshes, or glowing color orbs are present (e.g., orange wireframe sphere at x:20%, y:10%, w:400px), extract them in \`ambientLayers\` with coordinates, effect (e.g. \`drop-shadow(0 0 80px rgba(249, 115, 22, 0.5))\`), and color.
   - **Glassmorphism:** For glass cards/buttons (e.g., central 'Thesis' buttons or nav items), detect \`backdropBlur\` (e.g. \`backdrop-blur-md\`), semi-transparent background (e.g. \`rgba(255,255,255,0.05)\`), and subtle border (e.g. \`1px solid rgba(255,255,255,0.1)\`).
   - **Inner Glow / Shader:** For glowing pill buttons, extract custom \`innerGlow\` / \`boxShadow\` strings (e.g., \`inset 0 0 25px -5px rgba(249, 115, 22, 0.4), inset 0 0 10px rgba(249, 115, 22, 0.2)\`).
   - **Text Glow:** For brand titles (e.g., \`FABRIC™\`) or highlighted texts, extract exact \`textGlow\` / drop-shadow.

4. **Verbatim Text Copy Extraction (MANDATORY):**
   - In \`textContent\`, extract the EXACT visible words, numbers, trademarks, and symbols without summarizing or altering.

5. **Interactive States:**
   - Infer hover and active effects: hover elevate, hover glow, background transitions, cursor pointer.

6. **Responsive Rules (Desktop to Mobile 9:16):**
   - Define exact collapse rules: horizontal flex rows collapse into vertical stacks (\`flex-col\`), gap values scale by 50-60%.`;
}

export function normalizeToDesktop(
  elements: ElementSpatialNode[],
  sourceWidth: number,
  sourceHeight: number
): ElementSpatialNode[] {
  const scaleX = DESKTOP_REFERENCE.width / sourceWidth;
  const scaleY = DESKTOP_REFERENCE.height / sourceHeight;

  return elements.map((el) => {
    const coords = el.layout.desktop_16_9.coordinates;
    const scaled = {
      x: Math.round(coords.x * scaleX),
      y: Math.round(coords.y * scaleY),
      width: Math.round(coords.width * scaleX),
      height: Math.round(coords.height * scaleY),
    };

    const vpTop = `${((scaled.y / DESKTOP_REFERENCE.height) * 100).toFixed(1)}%`;
    const vpLeft = `${((scaled.x / DESKTOP_REFERENCE.width) * 100).toFixed(1)}%`;
    const vpWidth = `${((scaled.width / DESKTOP_REFERENCE.width) * 100).toFixed(1)}%`;
    const vpHeight = `${((scaled.height / DESKTOP_REFERENCE.height) * 100).toFixed(1)}%`;

    return {
      ...el,
      textContent: el.textContent,
      componentType: el.componentType,
      layout: {
        ...el.layout,
        desktop_16_9: {
          ...el.layout.desktop_16_9,
          coordinates: scaled,
          viewportPercentage: { top: vpTop, left: vpLeft, width: vpWidth, height: vpHeight },
          margin: el.layout.desktop_16_9.margin.map((m) => Math.round(m * scaleX)) as [number, number, number, number],
          padding: el.layout.desktop_16_9.padding.map((p) => Math.round(p * scaleX)) as [number, number, number, number],
          gap: el.layout.desktop_16_9.gap ? Math.round(el.layout.desktop_16_9.gap * scaleX) : undefined,
        },
      },
      children: el.children ? normalizeToDesktop(el.children, sourceWidth, sourceHeight) : undefined,
    };
  });
}
