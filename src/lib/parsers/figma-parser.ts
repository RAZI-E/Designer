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

interface FigmaNode {
  id: string;
  name: string;
  type: string;
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
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number }; opacity?: number }>;
  strokes?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number }; weight?: number }>;
  effects?: Array<{ type: string; visible?: boolean; offset?: { x: number; y: number }; radius?: number; color?: { r: number; g: number; b: number; a: number } }>;
  style?: { fontFamily?: string; fontSize?: number; fontWeight?: number; lineHeightPx?: number; letterSpacing?: number };
  characters?: string;
  children?: FigmaNode[];
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
}

interface FigmaFile {
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

function mapSemanticTag(name: string, figmaType: string): SemanticTag {
  const lower = name.toLowerCase();
  if (lower.includes("nav")) return "nav";
  if (lower.includes("header") || lower.includes("topbar")) return "header";
  if (lower.includes("footer")) return "footer";
  if (lower.includes("sidebar") || lower.includes("aside")) return "aside";
  if (lower.includes("main") || lower.includes("content")) return "main";
  if (lower.includes("section") || lower.includes("block")) return "section";
  if (lower.includes("article") || lower.includes("post")) return "article";
  if (lower.includes("btn") || lower.includes("button")) return "button";
  if (lower.includes("input") || lower.includes("field") || lower.includes("text")) return "input";
  if (lower.includes("link") || lower.includes("anchor")) return "a";
  if (figmaType === "TEXT") return "div";
  return "div";
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

function buildElementFromFigma(
  node: FigmaNode,
  canvasWidth: number,
  canvasHeight: number,
  parentBounds?: { x: number; y: number; width: number; height: number }
): ElementSpatialNode | null {
  const bounds = node.absoluteBoundingBox;
  if (!bounds) return null;

  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;

  const vpTop = `${((y / canvasHeight) * 100).toFixed(1)}%`;
  const vpLeft = `${((x / canvasWidth) * 100).toFixed(1)}%`;
  const vpWidth = `${((w / canvasWidth) * 100).toFixed(1)}%`;
  const vpHeight = `${((h / canvasHeight) * 100).toFixed(1)}%`;

  const mTop = parentBounds ? Math.max(0, y - parentBounds.y) : y;
  const mRight = parentBounds ? Math.max(0, parentBounds.x + parentBounds.width - (x + w)) : 0;
  const mBottom = parentBounds ? Math.max(0, parentBounds.y + parentBounds.height - (y + h)) : 0;
  const mLeft = parentBounds ? Math.max(0, x - parentBounds.x) : x;

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

  const posMode: DesktopLayout["positionMode"] = node.layoutMode && node.layoutMode !== "NONE" ? "flex" : "absolute";

  const desktop: DesktopLayout = {
    positionMode: posMode,
    coordinates: { x, y, width: w, height: h },
    viewportPercentage: { top: vpTop, left: vpLeft, width: vpWidth, height: vpHeight },
    margin: [Math.round(mTop), Math.round(mRight), Math.round(mBottom), Math.round(mLeft)],
    padding: [node.paddingTop || 0, node.paddingRight || 0, node.paddingBottom || 0, node.paddingLeft || 0],
    gap: node.itemSpacing || undefined,
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

  let bgColor = "transparent";
  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.color) {
      bgColor = rgbToHex(fill.color);
    }
  }

  const borderRadius = getBorderRadius(node);

  let borderColor = "transparent";
  let borderWidth = 0;
  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.color) borderColor = rgbToHex(stroke.color);
    borderWidth = stroke.weight || 1;
  }

  let boxShadow: string | undefined;
  if (node.effects) {
    const shadow = node.effects.find((e) => e.type === "DROP_SHADOW" && e.visible !== false);
    if (shadow && shadow.color) {
      const ox = shadow.offset?.x || 0;
      const oy = shadow.offset?.y || 0;
      const blur = shadow.radius || 0;
      const sc = shadow.color ? `${Math.round(shadow.color.r * 255)}, ${Math.round(shadow.color.g * 255)}, ${Math.round(shadow.color.b * 255)}` : "0,0,0";
      const sa = shadow.color?.a ?? 1;
      boxShadow = `${ox}px ${oy}px ${blur}px rgba(${sc}, ${sa.toFixed(2)})`;
    }
  }

  const opacity = node.fills?.[0]?.opacity ?? 1;

  let fontFamily = "Inter, sans-serif";
  let fontSizePx = 16;
  let fontWeight = 400;
  let lineHeightPx = 24;
  let letterSpacing = "normal";
  let textColor = "#000000";

  if (node.style) {
    fontFamily = node.style.fontFamily || fontFamily;
    fontSizePx = node.style.fontSize || fontSizePx;
    fontWeight = node.style.fontWeight || fontWeight;
    lineHeightPx = node.style.lineHeightPx || Math.round(fontSizePx * 1.5);
    letterSpacing = node.style.letterSpacing ? `${node.style.letterSpacing}px` : "normal";
  }

  if (node.type === "TEXT" && node.fills && node.fills.length > 0 && node.fills[0].color) {
    textColor = rgbToHex(node.fills[0].color);
  }

  const styling: ElementStyling = {
    backgroundColor: bgColor,
    borderRadius,
    border: { width: borderWidth, style: borderWidth > 0 ? "solid" : "none", color: borderColor },
    effects: {
      boxShadow,
      opacity,
    },
  };

  if (node.type === "TEXT") {
    styling.typography = {
      fontFamily,
      fontSizePx,
      fontWeight,
      lineHeightPx,
      letterSpacing,
      color: textColor,
    };
  }

  const isInteractive = mapSemanticTag(node.name, node.type) === "button" ||
    mapSemanticTag(node.name, node.type) === "a";

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

  const children: ElementSpatialNode[] = [];
  if (node.children) {
    for (const child of node.children) {
      const el = buildElementFromFigma(child, canvasWidth, canvasHeight, bounds);
      if (el) children.push(el);
    }
  }

  return {
    id: node.id,
    name: node.name,
    semanticTag: mapSemanticTag(node.name, node.type),
    layout: { desktop_16_9: desktop, mobile_9_16: mobile },
    styling,
    interactions,
    children: children.length > 0 ? children : undefined,
  };
}

function collectGlobalTokens(root: FigmaNode): DesignExtractionResult["globalTokens"] {
  const colors: Record<string, string> = {};
  const fonts: Record<string, string> = {};
  const shadows: string[] = [];
  const gradients: string[] = [];

  function walk(node: FigmaNode) {
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.color) {
          const hex = rgbToHex(fill.color);
          const name = hex.replace("#", "");
          if (!colors[name]) colors[name] = hex;
        }
      }
    }
    if (node.strokes) {
      for (const stroke of node.strokes) {
        if (stroke.color) {
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

export async function parseFigmaFile(file: FigmaFile): Promise<{
  elements: ElementSpatialNode[];
  globalTokens: DesignExtractionResult["globalTokens"];
  width: number;
  height: number;
}> {
  const document = file.document;
  const rootBounds = document.absoluteBoundingBox;
  const canvasWidth = rootBounds?.width || DESKTOP_REFERENCE.width;
  const canvasHeight = rootBounds?.height || DESKTOP_REFERENCE.height;

  const elements: ElementSpatialNode[] = [];
  if (document.children) {
    for (const child of document.children) {
      const el = buildElementFromFigma(child, canvasWidth, canvasHeight, rootBounds);
      if (el) elements.push(el);
    }
  }

  const globalTokens = collectGlobalTokens(document);

  return { elements, globalTokens, width: canvasWidth, height: canvasHeight };
}
