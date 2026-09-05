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
  return `You are a Principal Computer Vision Spatial Engineer and Senior UI Architect specializing in pixel-faithful design extraction.

Analyze this design image and extract EVERY visible element, container, navbar, button, badge, input, card, and typography node with exact mathematical precision.

## Critical Instructions for Extraction:
1. **EXACT TEXT CONTENT EXTRACTION (MANDATORY)**:
   - For every text element, button label, badge, heading, paragraph, menu item, icon label, or input placeholder, you MUST extract the EXACT visible text in the \`textContent\` property.
   - Do NOT omit text content or use placeholders like "Lorem ipsum". Extract the real words visible in the image.

2. **COMPONENT IDENTIFICATION**:
   - Set \`componentType\` accurately: "Navbar", "Hero Section", "Primary Button", "Secondary Button", "Search Input", "Feature Card", "Pricing Card", "Badge / Tag", "Heading (H1/H2)", "Body Text", "Footer", "Avatar", etc.

3. **DESKTOP LAYOUT (16:9 ratio, base 1920x1080)**:
   - **coordinates**: Exact pixel bounds (x, y, width, height) relative to the 1920x1080 canvas.
   - **viewportPercentage**: top%, left%, width%, height% for responsive behavior.
   - **positionMode**: "flex", "grid", "fixed", "absolute", or "sticky".
   - **margins and padding**: [top, right, bottom, left] in px.
   - **gap**: Gap between children in px.
   - **alignment**: justify and align values ("start", "center", "end", "between", "around", "stretch").
   - **zIndex**: If elements overlay each other.

4. **MOBILE LAYOUT (9:16 ratio, base 390x844)**:
   - **stackDirection**: "row" or "col" (desktop rows typically collapse to "col").
   - **margins and padding**: Proportional mobile padding/margin in px.
   - **visibility**: "visible", "hidden", "drawer", or "accordion".

5. **STYLING EXTRACTION**:
   - **backgroundColor**: Full CSS value (hex, rgba, or gradient like "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)").
   - **borderRadius**: Exact per-corner radii AND closest Tailwind class (e.g. 12px -> "rounded-xl", 9999px -> "rounded-full").
   - **border**: width, style ("solid", "dashed", "none"), and hex/rgba color.
   - **boxShadow**: Full CSS box-shadow string (including drop shadows, inner shadows, and outer glows).
   - **typography**: fontFamily, fontSizePx, fontWeight (400, 500, 600, 700), lineHeightPx, letterSpacing, color, textTransform.

6. **MICRO-INTERACTIONS**:
   - **hoverEffect**: cursor ("pointer"), transitionDurationMs, hover transform, hover backgroundColor, glow.
   - **activeClickEffect**: active transform (e.g. "scale(0.98)").

7. **GLOBAL DESIGN TOKENS**:
   - Collect all unique colors with semantic names (background, foreground, primary, secondary, accent, border, muted).
   - Collect all fonts, shadows, and gradients.`;
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
