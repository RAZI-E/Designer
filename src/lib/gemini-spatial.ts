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
        colors: { type: "object" },
        fonts: { type: "object" },
        shadows: { type: "array", items: { type: "string" } },
        gradients: { type: "array", items: { type: "string" } },
      },
      required: ["colors", "fonts", "shadows", "gradients"],
    },
  },
  required: ["elements", "globalTokens"],
};

export function buildExtractionPrompt(): string {
  return `You are a Computer Vision Spatial Engineer specializing in UI design analysis.

Analyze this design image and extract EVERY visible element with mathematical precision.

## Output Requirements

### Desktop Layout (16:9 ratio, base 1920x1080)
For each element, provide:
- **exact pixel coordinates** (x, y, width, height) relative to a 1920x1080 canvas
- **viewport percentages** (top%, left%, width%, height%) for responsive scaling
- **position mode**: fixed, absolute, flex, grid, or sticky
- **margins and padding** as [top, right, bottom, left] in px
- **gap** between children in px
- **alignment**: justify and align values
- **z-index** if layered

### Mobile Layout (9:16 ratio, base 390x844)
For each element, provide:
- **stack direction**: row or column
- **margins and padding** adapted for mobile
- **visibility**: visible, hidden, drawer, or accordion
- **position mode**

### Styling Extraction
- **background-color**: Full CSS value including gradients (e.g., "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)")
- **border-radius**: Per-corner pixel values AND tailwind equivalent (e.g., 12px -> "rounded-xl")
- **border**: width, style, color
- **box-shadow**: Full CSS shadow string. Distinguish:
  - Outer glow: "0 0 50px -12px rgba(99,102,241,0.25)"
  - Inner shadow: "inset 0 2px 4px rgba(0,0,0,0.1)"
  - Drop shadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
- **glow/ring**: Spread, blur, color, and tailwind class
- **backdrop-blur**: Value like "backdrop-blur-xl"
- **opacity**: 0-1

### Typography
- font-family, font-size (px), font-weight, line-height (px), letter-spacing, color, text-transform

### Micro-Interactions
- **hover**: transform, background-color change, glow, cursor, transition duration
- **active/click**: scale transform, ring effect
- **focus-visible**: ring style

## Semantic Tags
Map each element to: nav, header, main, section, article, aside, footer, div, button, input, a

## Important
- Extract ALL visible elements, even small ones (badges, icons, dividers, tags)
- Be precise with pixel measurements - estimate from visual proportions
- For gradients, specify exact color stops and positions
- For shadows, include ALL shadow layers (multi-layer shadows are common)
- Map every radius to the closest Tailwind class
- Include opacity for semi-transparent elements`;
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
