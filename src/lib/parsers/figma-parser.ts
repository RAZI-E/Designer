import type {
  ElementSpatialNode,
  DesignExtractionResult,
  SemanticTag,
  DesktopLayout,
  MobileLayout,
  ElementStyling,
  ElementInteractions,
  BorderRadius,
} from "@/lib/types/spatial";
import { DESKTOP_REFERENCE } from "@/lib/gemini-spatial";

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  fills?: Array<{
    type: string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a?: number };
    opacity?: number;
    gradientHandlePositions?: Array<{ x: number; y: number }>;
    gradientStops?: Array<{ position: number; color: { r: number; g: number; b: number; a?: number } }>;
  }>;
  strokes?: Array<{
    type: string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a?: number };
    weight?: number;
  }>;
  strokeWeight?: number;
  effects?: Array<{
    type: string;
    visible?: boolean;
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
    color?: { r: number; g: number; b: number; a?: number };
  }>;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    textCase?: "UPPER" | "LOWER" | "TITLE" | "ORIGINAL";
    textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  };
  characters?: string;
  children?: FigmaNode[];
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  backgroundColor?: { r: number; g: number; b: number; a?: number };
}

export interface FigmaFile {
  name: string;
  document: FigmaNode;
}

function rgbToHex(c: { r: number; g: number; b: number; a?: number }): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const alpha = c.a !== undefined ? c.a : 1;
  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function mapSemanticTag(name: string, figmaType: string): SemanticTag {
  const lower = name.toLowerCase();
  if (lower.includes("nav") || lower.includes("navbar") || lower.includes("menu")) return "nav";
  if (lower.includes("header") || lower.includes("topbar") || lower.includes("appbar")) return "header";
  if (lower.includes("footer") || lower.includes("bottombar")) return "footer";
  if (lower.includes("sidebar") || lower.includes("aside") || lower.includes("drawer")) return "aside";
  if (lower.includes("main") || lower.includes("content") || lower.includes("body")) return "main";
  if (lower.includes("hero") || lower.includes("banner") || lower.includes("section") || lower.includes("feature")) return "section";
  if (lower.includes("card") || lower.includes("item") || lower.includes("post") || lower.includes("article")) return "article";
  if (lower.includes("btn") || lower.includes("button") || lower.includes("cta") || lower.includes("action")) return "button";
  if (lower.includes("input") || lower.includes("search") || lower.includes("field") || lower.includes("textbox") || lower.includes("textarea")) return "input";
  if (lower.includes("link") || lower.includes("anchor") || lower.includes("tab")) return "a";
  if (figmaType === "TEXT") return "div";
  return "div";
}

function detectComponentType(name: string, figmaType: string, characters?: string): string {
  const lower = name.toLowerCase();
  if (figmaType === "TEXT" || characters) {
    if (lower.includes("title") || lower.includes("heading") || lower.includes("h1") || lower.includes("h2")) return "Heading";
    if (lower.includes("subtitle") || lower.includes("caption") || lower.includes("desc")) return "Subtitle / Description";
    if (lower.includes("badge") || lower.includes("tag") || lower.includes("pill")) return "Badge / Tag";
    if (lower.includes("label")) return "Field Label";
    return "Typography Text";
  }
  if (lower.includes("nav") || lower.includes("navbar")) return "Navigation Bar";
  if (lower.includes("btn") || lower.includes("button") || lower.includes("cta")) return "Interactive Button";
  if (lower.includes("card")) return "Content Card";
  if (lower.includes("input") || lower.includes("search")) return "Form Input";
  if (lower.includes("hero")) return "Hero Section";
  if (lower.includes("icon") || figmaType === "VECTOR") return "Icon / Graphic Element";
  if (figmaType === "INSTANCE") return "Component Instance";
  if (figmaType === "FRAME") return "Layout Container / Frame";
  return figmaType;
}

function getBorderRadius(node: FigmaNode): BorderRadius {
  const tl = node.topLeftRadius ?? node.cornerRadius ?? 0;
  const tr = node.topRightRadius ?? node.cornerRadius ?? 0;
  const br = node.bottomRightRadius ?? node.cornerRadius ?? 0;
  const bl = node.bottomLeftRadius ?? node.cornerRadius ?? 0;

  let tw = "rounded-none";
  if (tl === tr && tr === br && br === bl) {
    if (tl === 0) tw = "rounded-none";
    else if (tl <= 2) tw = "rounded-sm";
    else if (tl <= 4) tw = "rounded";
    else if (tl <= 6) tw = "rounded-md";
    else if (tl <= 8) tw = "rounded-lg";
    else if (tl <= 12) tw = "rounded-xl";
    else if (tl <= 16) tw = "rounded-2xl";
    else if (tl <= 24) tw = "rounded-3xl";
    else tw = "rounded-full";
  }

  return { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl, tailwindEquivalent: tw };
}

/**
 * Deeply parse a Figma node into an ElementSpatialNode with precise bounding boxes,
 * relative margins, paddings, typography, text characters, borders, and nested children.
 */
export function buildElementFromFigma(
  node: FigmaNode,
  canvasWidth: number,
  canvasHeight: number,
  parentBounds?: { x: number; y: number; width: number; height: number },
  isRootBorder: boolean = false
): ElementSpatialNode | null {
  if (node.visible === false) return null;

  const bounds = node.absoluteBoundingBox;
  // If node doesn't have an absoluteBoundingBox, skip unless it has children we can unwrap
  if (!bounds) {
    return null;
  }

  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;

  // Ignore 0x0 hidden elements
  if (w <= 0 && h <= 0) return null;

  // Calculate coordinates relative to parent container or root canvas
  const relX = parentBounds ? Math.round(x - parentBounds.x) : Math.round(x);
  const relY = parentBounds ? Math.round(y - parentBounds.y) : Math.round(y);

  const vpTop = `${((relY / canvasHeight) * 100).toFixed(1)}%`;
  const vpLeft = `${((relX / canvasWidth) * 100).toFixed(1)}%`;
  const vpWidth = `${((w / canvasWidth) * 100).toFixed(1)}%`;
  const vpHeight = `${((h / canvasHeight) * 100).toFixed(1)}%`;

  const mTop = relY;
  const mRight = parentBounds ? Math.max(0, Math.round(parentBounds.width - (relX + w))) : 0;
  const mBottom = parentBounds ? Math.max(0, Math.round(parentBounds.height - (relY + h))) : 0;
  const mLeft = relX;

  const justify = (() => {
    switch (node.primaryAxisAlignItems) {
      case "CENTER": return "center";
      case "MAX": return "end";
      case "SPACE_BETWEEN": return "between";
      default: return "start";
    }
  })();

  const align = (() => {
    switch (node.counterAxisAlignItems) {
      case "CENTER": return "center";
      case "MAX": return "end";
      case "BASELINE": return "stretch";
      default: return "start";
    }
  })();

  const isAutoLayout = Boolean(node.layoutMode && node.layoutMode !== "NONE");
  const posMode: DesktopLayout["positionMode"] = isAutoLayout
    ? "flex"
    : isRootBorder
    ? "relative" as any
    : "absolute";

  const desktop: DesktopLayout = {
    positionMode: posMode,
    coordinates: { x: relX, y: relY, width: Math.round(w), height: Math.round(h) },
    viewportPercentage: { top: vpTop, left: vpLeft, width: vpWidth, height: vpHeight },
    margin: [Math.round(mTop), Math.round(mRight), Math.round(mBottom), Math.round(mLeft)],
    padding: [
      Math.round(node.paddingTop || 0),
      Math.round(node.paddingRight || 0),
      Math.round(node.paddingBottom || 0),
      Math.round(node.paddingLeft || 0),
    ],
    gap: node.itemSpacing ? Math.round(node.itemSpacing) : undefined,
    alignment: { justify, align },
    zIndex: 0,
  };

  const mobile: MobileLayout = {
    positionMode: posMode,
    stackDirection: node.layoutMode === "HORIZONTAL" ? "row" : "col",
    margin: [Math.round(mTop * 0.5), Math.round(mRight * 0.5), Math.round(mBottom * 0.5), Math.round(mLeft * 0.5)],
    padding: [
      Math.round((node.paddingTop || 0) * 0.75),
      Math.round((node.paddingRight || 0) * 0.75),
      Math.round((node.paddingBottom || 0) * 0.75),
      Math.round((node.paddingLeft || 0) * 0.75),
    ],
    gap: node.itemSpacing ? Math.round(node.itemSpacing * 0.75) : undefined,
    visibility: "visible",
  };

  // Background color / fill extraction
  let bgColor = "transparent";
  if (node.fills && node.fills.length > 0) {
    const visibleFill = node.fills.find((f) => f.visible !== false && f.color);
    if (visibleFill && visibleFill.color) {
      bgColor = rgbToHex(visibleFill.color);
    }
  } else if (node.backgroundColor) {
    bgColor = rgbToHex(node.backgroundColor);
  }

  const borderRadius = getBorderRadius(node);

  // Stroke / border extraction
  let borderColor = "transparent";
  let borderWidth = 0;
  if (node.strokes && node.strokes.length > 0) {
    const visibleStroke = node.strokes.find((s) => s.visible !== false && s.color);
    if (visibleStroke && visibleStroke.color) {
      borderColor = rgbToHex(visibleStroke.color);
      borderWidth = node.strokeWeight || visibleStroke.weight || 1;
    }
  }

  // Effects (drop shadows, inner shadows)
  let boxShadow: string | undefined;
  if (node.effects) {
    const shadow = node.effects.find(
      (e) => (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") && e.visible !== false
    );
    if (shadow && shadow.color) {
      const ox = shadow.offset?.x || 0;
      const oy = shadow.offset?.y || 0;
      const blur = shadow.radius || 0;
      const spread = shadow.spread || 0;
      const sc = `${Math.round(shadow.color.r * 255)}, ${Math.round(shadow.color.g * 255)}, ${Math.round(shadow.color.b * 255)}`;
      const sa = shadow.color?.a ?? 1;
      const inset = shadow.type === "INNER_SHADOW" ? "inset " : "";
      boxShadow = `${inset}${ox}px ${oy}px ${blur}px ${spread}px rgba(${sc}, ${sa.toFixed(2)})`;
    }
  }

  const opacity = node.fills?.[0]?.opacity ?? 1;

  // Typography & Text Content
  let typography;
  const rawCharacters = node.characters?.trim();
  if (node.type === "TEXT" || node.style || rawCharacters) {
    let fontFamily = node.style?.fontFamily || "Inter, sans-serif";
    let fontSizePx = Math.round(node.style?.fontSize || 16);
    let fontWeight = node.style?.fontWeight || 400;
    let lineHeightPx = Math.round(node.style?.lineHeightPx || fontSizePx * 1.5);
    let letterSpacing = node.style?.letterSpacing ? `${node.style.letterSpacing}px` : "normal";
    let textColor = "#000000";

    if (node.fills && node.fills.length > 0 && node.fills[0].color) {
      textColor = rgbToHex(node.fills[0].color);
    }

    let textTransform: "uppercase" | "lowercase" | "capitalize" | "none" = "none";
    if (node.style?.textCase === "UPPER") textTransform = "uppercase";
    else if (node.style?.textCase === "LOWER") textTransform = "lowercase";
    else if (node.style?.textCase === "TITLE") textTransform = "capitalize";

    typography = {
      fontFamily,
      fontSizePx,
      fontWeight,
      lineHeightPx,
      letterSpacing,
      color: textColor,
      textTransform,
    };
  }

  const styling: ElementStyling = {
    backgroundColor: bgColor,
    borderRadius,
    border: { width: borderWidth, style: borderWidth > 0 ? "solid" : "none", color: borderColor },
    effects: {
      boxShadow,
      opacity,
    },
    typography,
  };

  const semanticTag = mapSemanticTag(node.name, node.type);
  const isInteractive = semanticTag === "button" || semanticTag === "a" || semanticTag === "input";

  const interactions: ElementInteractions = {};
  if (isInteractive) {
    interactions.hoverEffect = {
      cursor: "pointer",
      transitionDurationMs: 200,
    };
    interactions.activeClickEffect = {
      transform: "scale(0.98)",
    };
  }

  // Deep recursive extraction of all children
  const children: ElementSpatialNode[] = [];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childEl = buildElementFromFigma(child, w, h, bounds, false);
      if (childEl) {
        children.push(childEl);
      }
    }
  }

  const compType = detectComponentType(node.name, node.type, rawCharacters);

  return {
    id: node.id,
    name: node.name,
    semanticTag,
    textContent: rawCharacters || undefined,
    componentType: compType,
    layout: { desktop_16_9: desktop, mobile_9_16: mobile },
    styling,
    interactions,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * Traverse the full tree to collect all colors, fonts, shadows, and gradients.
 */
function collectGlobalTokens(root: FigmaNode): DesignExtractionResult["globalTokens"] {
  const colors: Record<string, string> = {};
  const fonts: Record<string, string> = {};
  const shadows: string[] = [];
  const gradients: string[] = [];

  function walk(node: FigmaNode) {
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.color && fill.visible !== false) {
          const hex = rgbToHex(fill.color);
          const name = hex.replace("#", "");
          if (!colors[name]) colors[name] = hex;
        }
      }
    }
    if (node.strokes) {
      for (const stroke of node.strokes) {
        if (stroke.color && stroke.visible !== false) {
          const hex = rgbToHex(stroke.color);
          const name = `stroke-${hex.replace("#", "")}`;
          if (!colors[name]) colors[name] = hex;
        }
      }
    }
    if (node.style?.fontFamily) {
      fonts[node.style.fontFamily] = node.style.fontFamily;
    }
    if (node.effects) {
      for (const effect of node.effects) {
        if ((effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") && effect.visible !== false && effect.color) {
          const ox = effect.offset?.x || 0;
          const oy = effect.offset?.y || 0;
          const blur = effect.radius || 0;
          const sc = `${Math.round(effect.color.r * 255)}, ${Math.round(effect.color.g * 255)}, ${Math.round(effect.color.b * 255)}`;
          const sa = effect.color?.a ?? 1;
          const shadow = `${ox}px ${oy}px ${blur}px rgba(${sc}, ${sa.toFixed(2)})`;
          if (!shadows.includes(shadow)) shadows.push(shadow);
        }
      }
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  walk(root);
  return { colors, fonts, shadows, gradients };
}

/**
 * Parse the Figma JSON document hierarchy:
 * 1. Unwraps DOCUMENT -> CANVAS pages.
 * 2. Identifies the primary Artboard / Screen Border Frames (where the design lives).
 * 3. Builds detailed outer container specs, then recursively extracts all nested elements.
 */
export async function parseFigmaFile(file: FigmaFile): Promise<{
  elements: ElementSpatialNode[];
  globalTokens: DesignExtractionResult["globalTokens"];
  width: number;
  height: number;
}> {
  const document = file.document;
  const elements: ElementSpatialNode[] = [];

  // Step 1: Collect all CANVAS pages
  const canvasPages: FigmaNode[] = [];
  if (document.type === "DOCUMENT" && document.children) {
    for (const child of document.children) {
      if (child.type === "CANVAS") {
        canvasPages.push(child);
      }
    }
  } else if (document.type === "CANVAS") {
    canvasPages.push(document);
  }

  // Fallback: If no CANVAS found, treat document itself as root
  if (canvasPages.length === 0) {
    canvasPages.push(document);
  }

  // Step 2: Find all top-level artboards/frames across canvas pages
  const rootArtboards: FigmaNode[] = [];
  for (const page of canvasPages) {
    if (page.children) {
      for (const child of page.children) {
        // Frames, Sections, Components, or any top-level layout containers
        if (
          (child.type === "FRAME" ||
            child.type === "SECTION" ||
            child.type === "COMPONENT" ||
            child.type === "GROUP") &&
          child.absoluteBoundingBox &&
          child.visible !== false
        ) {
          rootArtboards.push(child);
        }
      }
    }
  }

  let canvasWidth: number = DESKTOP_REFERENCE.width;
  let canvasHeight: number = DESKTOP_REFERENCE.height;

  if (rootArtboards.length > 0) {
    // Pick the primary artboard (often the largest or first artboard, e.g. 1440px or 1920px)
    const primary = rootArtboards.reduce((prev, curr) => {
      const prevArea = (prev.absoluteBoundingBox?.width || 0) * (prev.absoluteBoundingBox?.height || 0);
      const currArea = (curr.absoluteBoundingBox?.width || 0) * (curr.absoluteBoundingBox?.height || 0);
      return currArea > prevArea ? curr : prev;
    }, rootArtboards[0]);

    if (primary.absoluteBoundingBox) {
      canvasWidth = Math.round(primary.absoluteBoundingBox.width);
      canvasHeight = Math.round(primary.absoluteBoundingBox.height);
    }

    // Process each artboard. The artboard itself is the primary outer border container.
    for (const artboard of rootArtboards) {
      const artboardEl = buildElementFromFigma(
        artboard,
        canvasWidth,
        canvasHeight,
        undefined,
        true // isRootBorder = true
      );
      if (artboardEl) {
        elements.push(artboardEl);
      }
    }
  } else {
    // No top-level frames found (flat file or direct elements)
    const rootBounds = document.absoluteBoundingBox;
    canvasWidth = rootBounds?.width || DESKTOP_REFERENCE.width;
    canvasHeight = rootBounds?.height || DESKTOP_REFERENCE.height;

    for (const page of canvasPages) {
      if (page.children) {
        for (const child of page.children) {
          const el = buildElementFromFigma(child, canvasWidth, canvasHeight, rootBounds, false);
          if (el) elements.push(el);
        }
      }
    }
  }

  const globalTokens = collectGlobalTokens(document);

  return {
    elements,
    globalTokens,
    width: canvasWidth,
    height: canvasHeight,
  };
}
