import { readPsd, Layer } from "ag-psd";
import type {
  ElementSpatialNode,
  DesktopLayout,
  MobileLayout,
  SemanticTag,
  ElementStyling,
  ElementInteractions,
  BorderRadius,
} from "@/lib/types/spatial";
import { generateId } from "@/lib/utils";

function colorToHex(c?: any): string {
  if (!c) return "transparent";
  if (typeof c.r === "number" && typeof c.g === "number" && typeof c.b === "number") {
    const r = Math.min(255, Math.max(0, Math.round(c.r)));
    const g = Math.min(255, Math.max(0, Math.round(c.g)));
    const b = Math.min(255, Math.max(0, Math.round(c.b)));
    const alpha = typeof c.a === "number" ? c.a : 1;
    if (alpha < 1) return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  if (typeof c.fr === "number" && typeof c.fg === "number" && typeof c.fb === "number") {
    const r = Math.min(255, Math.max(0, Math.round(c.fr * 255)));
    const g = Math.min(255, Math.max(0, Math.round(c.fg * 255)));
    const b = Math.min(255, Math.max(0, Math.round(c.fb * 255)));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  if (typeof c.k === "number") {
    const r = Math.round(255 * (1 - (c.c || 0) / 100) * (1 - c.k / 100));
    const g = Math.round(255 * (1 - (c.m || 0) / 100) * (1 - c.k / 100));
    const b = Math.round(255 * (1 - (c.y || 0) / 100) * (1 - c.k / 100));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  return "#000000";
}

function getUnitsNumber(val?: any, fallback: number = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "number") return val;
  if (typeof val.value === "number") return val.value;
  return fallback;
}

function mapSemanticTag(name: string): SemanticTag {
  const lower = name.toLowerCase();
  if (lower.includes("nav") || lower.includes("menu")) return "nav";
  if (lower.includes("header") || lower.includes("topbar")) return "header";
  if (lower.includes("footer")) return "footer";
  if (lower.includes("sidebar") || lower.includes("aside")) return "aside";
  if (lower.includes("main") || lower.includes("hero")) return "main";
  if (lower.includes("section") || lower.includes("block")) return "section";
  if (lower.includes("article") || lower.includes("card")) return "article";
  if (lower.includes("btn") || lower.includes("button") || lower.includes("cta")) return "button";
  if (lower.includes("input") || lower.includes("field") || lower.includes("search")) return "input";
  if (lower.includes("link") || lower.includes("anchor")) return "a";
  return "div";
}

function detectFontWeight(fontName?: string): number {
  if (!fontName) return 400;
  const lower = fontName.toLowerCase();
  if (lower.includes("thin") || lower.includes("hairline")) return 100;
  if (lower.includes("extralight") || lower.includes("ultralight")) return 200;
  if (lower.includes("light")) return 300;
  if (lower.includes("medium")) return 500;
  if (lower.includes("semibold") || lower.includes("demibold")) return 600;
  if (lower.includes("extrabold") || lower.includes("ultrabold")) return 800;
  if (lower.includes("bold")) return 700;
  if (lower.includes("black") || lower.includes("heavy")) return 900;
  return 400;
}

interface ParentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildElementFromPsdLayer(
  layer: Layer,
  canvasWidth: number,
  canvasHeight: number,
  parentBounds?: ParentBounds,
  colorTokens?: Record<string, string>,
  fontTokens?: Record<string, string>,
  shadowTokens?: string[]
): ElementSpatialNode | null {
  const hasChildren = Boolean(layer.children && layer.children.length > 0);
  const isVisible = layer.hidden !== true;
  if (!isVisible && !hasChildren) return null;

  const left = layer.left ?? 0;
  const top = layer.top ?? 0;
  const right = layer.right ?? left;
  const bottom = layer.bottom ?? top;

  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  if (width === 0 && height === 0 && !hasChildren) return null;

  const name = layer.name || "Layer";
  const semanticTag = mapSemanticTag(name);

  const vpTop = `${((top / canvasHeight) * 100).toFixed(1)}%`;
  const vpLeft = `${((left / canvasWidth) * 100).toFixed(1)}%`;
  const vpWidth = `${((Math.max(1, width) / canvasWidth) * 100).toFixed(1)}%`;
  const vpHeight = `${((Math.max(1, height) / canvasHeight) * 100).toFixed(1)}%`;

  const mTop = parentBounds ? Math.max(0, top - parentBounds.y) : top;
  const mRight = parentBounds ? Math.max(0, parentBounds.x + parentBounds.width - (left + width)) : 0;
  const mBottom = parentBounds ? Math.max(0, parentBounds.y + parentBounds.height - (top + height)) : 0;
  const mLeft = parentBounds ? Math.max(0, left - parentBounds.x) : left;

  const currentBounds: ParentBounds = { x: left, y: top, width: Math.max(1, width), height: Math.max(1, height) };

  const desktop: DesktopLayout = {
    positionMode: hasChildren ? "flex" : "absolute",
    coordinates: { x: left, y: top, width, height },
    viewportPercentage: { top: vpTop, left: vpLeft, width: vpWidth, height: vpHeight },
    margin: [Math.round(mTop), Math.round(mRight), Math.round(mBottom), Math.round(mLeft)],
    padding: [0, 0, 0, 0],
    alignment: { justify: "start", align: "start" },
    zIndex: 0,
  };

  const mobile: MobileLayout = {
    positionMode: hasChildren ? "flex" : "absolute",
    stackDirection: "col",
    margin: [Math.round(mTop * 0.5), Math.round(mRight * 0.5), Math.round(mBottom * 0.5), Math.round(mLeft * 0.5)],
    padding: [0, 0, 0, 0],
    visibility: "visible",
  };

  let bgColor = "transparent";
  const solidFill = layer.effects?.solidFill?.[0];
  if (solidFill?.color) {
    bgColor = colorToHex(solidFill.color);
  } else if ((layer as any).vectorFill?.color) {
    bgColor = colorToHex((layer as any).vectorFill.color);
  }

  if (bgColor !== "transparent" && colorTokens) {
    const key = `color_${Object.keys(colorTokens).length + 1}`;
    colorTokens[key] = bgColor;
  }

  let borderColor = "transparent";
  let borderWidth = 0;
  const stroke = layer.effects?.stroke?.[0];
  if (stroke?.color) {
    borderColor = colorToHex(stroke.color);
    borderWidth = getUnitsNumber(stroke.size, 1);
  }

  let boxShadow: string | undefined;
  const shadow = layer.effects?.dropShadow?.[0];
  if (shadow?.color) {
    const dist = getUnitsNumber(shadow.distance, 4);
    const blur = getUnitsNumber(shadow.size, 8);
    const ox = Math.round(dist * 0.7);
    const oy = Math.round(dist * 0.7);
    const alpha = shadow.opacity !== undefined ? shadow.opacity : 0.25;
    boxShadow = `${ox}px ${oy}px ${blur}px rgba(0, 0, 0, ${alpha.toFixed(2)})`;
    if (shadowTokens && !shadowTokens.includes(boxShadow)) {
      shadowTokens.push(boxShadow);
    }
  }

  const borderRadius: BorderRadius = {
    topLeft: 0,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0,
    tailwindEquivalent: "rounded-none",
  };

  const styling: ElementStyling = {
    backgroundColor: bgColor,
    borderRadius,
    border: { width: borderWidth, style: borderWidth > 0 ? "solid" : "none", color: borderColor },
    effects: {
      boxShadow,
      opacity: layer.opacity !== undefined ? Number(layer.opacity.toFixed(2)) : 1,
    },
  };

  if (layer.text) {
    const style = layer.text.style;
    const rawFont = style?.font?.name || "Inter, sans-serif";
    const fontSize = style?.fontSize ? Math.round(getUnitsNumber(style.fontSize, 16)) : 16;
    const fontWeight = detectFontWeight(rawFont);
    const textColor = style?.fillColor ? colorToHex(style.fillColor) : "#ffffff";
    const lineHeight = style?.leading ? Math.round(getUnitsNumber(style.leading, fontSize * 1.4)) : Math.round(fontSize * 1.4);
    const isAllCaps = Boolean((style as any)?.allCaps);

    styling.typography = {
      fontFamily: rawFont,
      fontSizePx: fontSize,
      fontWeight,
      lineHeightPx: lineHeight,
      letterSpacing: style?.tracking ? `${(getUnitsNumber(style.tracking) / 1000).toFixed(2)}em` : "normal",
      color: textColor,
      textTransform: isAllCaps ? "uppercase" : "none",
    };

    if (fontTokens && rawFont) {
      const fontKey = `font_${Object.keys(fontTokens).length + 1}`;
      if (!Object.values(fontTokens).includes(rawFont)) {
        fontTokens[fontKey] = rawFont;
      }
    }
  }

  const interactions: ElementInteractions = {};
  if (semanticTag === "button" || semanticTag === "a") {
    interactions.hoverEffect = {
      cursor: "pointer",
      transitionDurationMs: 200,
      transform: "translateY(-1px)",
    };
    interactions.activeClickEffect = {
      transform: "scale(0.98)",
    };
  }

  const children: ElementSpatialNode[] = [];
  if (layer.children && layer.children.length > 0) {
    for (const child of layer.children) {
      const el = buildElementFromPsdLayer(
        child,
        canvasWidth,
        canvasHeight,
        currentBounds,
        colorTokens,
        fontTokens,
        shadowTokens
      );
      if (el) children.push(el);
    }
  }

  return {
    id: generateId(),
    name,
    semanticTag,
    layout: { desktop_16_9: desktop, mobile_9_16: mobile },
    styling,
    interactions,
    children: children.length > 0 ? children : undefined,
  };
}

export async function parsePSD(buffer: ArrayBuffer): Promise<{
  elements: ElementSpatialNode[];
  globalTokens: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
    shadows: string[];
    gradients: string[];
  };
  width: number;
  height: number;
  totalElements: number;
}> {
  // CRITICAL PERFORMANCE FIX:
  // Skipping raw raster image decompression makes parsing 100x faster,
  // extracting the entire Photoshop DOM structure, vectors, coordinates, and typography in milliseconds.
  const psd = readPsd(buffer, {
    skipLayerImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
    skipLinkedFilesData: true,
  });

  const width = psd.width || 1920;
  const height = psd.height || 1080;

  const colorTokens: Record<string, string> = {};
  const fontTokens: Record<string, string> = {};
  const shadowTokens: string[] = [];

  const elements: ElementSpatialNode[] = [];

  if (psd.children && psd.children.length > 0) {
    for (const layer of psd.children) {
      const node = buildElementFromPsdLayer(
        layer,
        width,
        height,
        undefined,
        colorTokens,
        fontTokens,
        shadowTokens
      );
      if (node) {
        elements.push(node);
      }
    }
  }

  if (elements.length === 0) {
    elements.push({
      id: generateId(),
      name: psd.name || "Root Canvas",
      semanticTag: "main",
      layout: {
        desktop_16_9: {
          positionMode: "flex",
          coordinates: { x: 0, y: 0, width, height },
          viewportPercentage: { top: "0%", left: "0%", width: "100%", height: "100%" },
          margin: [0, 0, 0, 0],
          padding: [24, 24, 24, 24],
          alignment: { justify: "start", align: "start" },
          zIndex: 0,
        },
      },
      styling: {
        backgroundColor: "transparent",
        borderRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0, tailwindEquivalent: "rounded-none" },
        border: { width: 0, style: "none", color: "transparent" },
        effects: { opacity: 1 },
      },
      interactions: {},
    });
  }

  function countAll(nodes: ElementSpatialNode[]): number {
    let count = nodes.length;
    for (const n of nodes) {
      if (n.children) count += countAll(n.children);
    }
    return count;
  }

  return {
    elements,
    globalTokens: {
      colors: colorTokens,
      fonts: fontTokens,
      shadows: shadowTokens,
      gradients: [],
    },
    width,
    height,
    totalElements: countAll(elements),
  };
}
