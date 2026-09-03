import type { SpecComponent, ComponentCategory, BoundingBox, SpatialDistances, SpecLayout, SpecStyles, DesignTokens } from "@/lib/types/spec-dsl";
import { generateId, formatComponentName, closestTailwindColor, closestTailwindSpacing, TAILWIND_COLORS } from "@/lib/utils";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  layoutAlign?: string;
  layoutGrow?: number;
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
    color?: { r: number; g: number; b: number; a: number };
    opacity?: number;
  }>;
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a: number };
    weight?: number;
  }>;
  effects?: Array<{
    type: string;
    visible?: boolean;
    offset?: { x: number; y: number };
    radius?: number;
    color?: { r: number; g: number; b: number; a: number };
  }>;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
    textAlignHorizontal?: string;
    textAlignVertical?: string;
  };
  characters?: string;
  children?: FigmaNode[];
  componentId?: string;
  componentProperties?: Record<string, unknown>;
}

interface FigmaFile {
  name: string;
  document: FigmaNode;
  components?: Record<string, { name: string }>;
  styles?: Record<string, { name: string; style_type: string }>;
}

function categorizeComponent(name: string): ComponentCategory {
  const lower = name.toLowerCase();
  if (lower.includes("nav") || lower.includes("header") || lower.includes("menu")) return "Navbar";
  if (lower.includes("hero") || lower.includes("banner")) return "Hero";
  if (lower.includes("card") || lower.includes("tile")) return "Card";
  if (lower.includes("btn") || lower.includes("button")) return "Button";
  if (lower.includes("form") || lower.includes("field")) return "Form";
  if (lower.includes("modal") || lower.includes("dialog")) return "Modal";
  if (lower.includes("footer")) return "Footer";
  if (lower.includes("sidebar") || lower.includes("panel")) return "Sidebar";
  if (lower.includes("input") || lower.includes("text")) return "Input";
  if (lower.includes("badge") || lower.includes("tag")) return "Badge";
  if (lower.includes("avatar") || lower.includes("profile")) return "Avatar";
  if (lower.includes("table") || lower.includes("row")) return "Table";
  if (lower.includes("list")) return "List";
  if (lower.includes("section") || lower.includes("block")) return "Section";
  if (lower.includes("container") || lower.includes("wrapper")) return "Container";
  if (lower.includes("image") || lower.includes("img") || lower.includes("icon")) return "Image";
  if (lower.includes("divider") || lower.includes("separator")) return "Divider";
  return "Unknown";
}

function rgbToHex(figmaColor: { r: number; g: number; b: number }): string {
  const r = Math.round(figmaColor.r * 255);
  const g = Math.round(figmaColor.g * 255);
  const b = Math.round(figmaColor.b * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function extractLayoutFromFigma(node: FigmaNode): SpecLayout {
  const layout: SpecLayout = {
    type: node.layoutMode === "NONE" ? "absolute" : "flex",
    direction: node.layoutMode === "HORIZONTAL" ? "row" : "column",
    gap: node.itemSpacing || 0,
    padding: {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0,
    },
  };

  if (node.primaryAxisAlignItems) {
    const justifyMap: Record<string, SpecLayout["justify"]> = {
      MIN: "start",
      CENTER: "center",
      MAX: "end",
      SPACE_BETWEEN: "between",
    };
    layout.justify = justifyMap[node.primaryAxisAlignItems] || "start";
  }

  if (node.counterAxisAlignItems) {
    const alignMap: Record<string, SpecLayout["align"]> = {
      MIN: "start",
      CENTER: "center",
      MAX: "end",
      BASELINE: "stretch",
    };
    layout.align = alignMap[node.counterAxisAlignItems] || "start";
  }

  return layout;
}

function extractStylesFromFigma(node: FigmaNode): SpecStyles {
  const styles: SpecStyles = {
    colors: {},
    radius: 0,
  };

  if (node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.color) {
      styles.colors.fill = rgbToHex(fill.color);
    }
  }

  if (node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.color) {
      styles.colors.stroke = rgbToHex(stroke.color);
    }
    if (stroke.weight) {
      styles.border = { width: stroke.weight, color: styles.colors.stroke || "#000000" };
    }
  }

  if (node.effects) {
    const shadow = node.effects.find((e) => e.type === "DROP_SHADOW" && e.visible !== false);
    if (shadow) {
      const x = shadow.offset?.x || 0;
      const y = shadow.offset?.y || 0;
      const r = shadow.radius || 0;
      const c = shadow.color ? rgbToHex(shadow.color) : "#000000";
      styles.shadow = `${x}px ${y}px ${r}px ${c}`;
    }
  }

  if (node.style) {
    if (node.style.fontSize) styles.fontSize = node.style.fontSize;
    if (node.style.fontWeight) styles.fontWeight = node.style.fontWeight;
    if (node.style.lineHeightPx) styles.lineHeight = node.style.lineHeightPx;
    if (node.style.fontFamily) styles.fontFamily = node.style.fontFamily;
  }

  return styles;
}

function calculateSpatialDistances(node: FigmaNode, parentBounds?: BoundingBox): SpatialDistances {
  const bounds = node.absoluteBoundingBox;
  if (!bounds || !parentBounds) {
    return {
      marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0,
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    };
  }

  return {
    marginTop: Math.max(0, bounds.y - parentBounds.y),
    marginRight: Math.max(0, parentBounds.x + parentBounds.width - (bounds.x + bounds.width)),
    marginBottom: Math.max(0, parentBounds.y + parentBounds.height - (bounds.y + bounds.height)),
    marginLeft: Math.max(0, bounds.x - parentBounds.x),
    paddingTop: node.paddingTop || 0,
    paddingRight: node.paddingRight || 0,
    paddingBottom: node.paddingBottom || 0,
    paddingLeft: node.paddingLeft || 0,
  };
}

function buildComponentFromFigmaNode(node: FigmaNode, parentBounds?: BoundingBox): SpecComponent | null {
  const bounds = node.absoluteBoundingBox;
  if (!bounds) return null;

  const bbox: BoundingBox = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };

  const children: SpecComponent[] = [];
  if (node.children) {
    for (const child of node.children) {
      const component = buildComponentFromFigmaNode(child, bbox);
      if (component) children.push(component);
    }
  }

  return {
    id: node.id,
    name: node.name,
    category: categorizeComponent(node.name),
    boundingBox: bbox,
    spatialDistances: calculateSpatialDistances(node, parentBounds),
    layout: extractLayoutFromFigma(node),
    styles: extractStylesFromFigma(node),
    children,
    textContent: node.characters,
    componentName: formatComponentName(node.name),
  };
}

export async function parseFigmaFile(file: FigmaFile): Promise<{
  components: SpecComponent[];
  designTokens: DesignTokens;
  width: number;
  height: number;
}> {
  const document = file.document;
  const rootBounds = document.absoluteBoundingBox;

  const components: SpecComponent[] = [];
  if (document.children) {
    for (const child of document.children) {
      const component = buildComponentFromFigmaNode(child, rootBounds ? {
        x: rootBounds.x,
        y: rootBounds.y,
        width: rootBounds.width,
        height: rootBounds.height,
      } : undefined);
      if (component) components.push(component);
    }
  }

  const designTokens = extractDesignTokens(document);

  return {
    components,
    designTokens,
    width: rootBounds?.width || 1440,
    height: rootBounds?.height || 900,
  };
}

function extractDesignTokens(root: FigmaNode): DesignTokens {
  const colors = new Set<string>();

  function collectColors(node: FigmaNode) {
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.color) colors.add(rgbToHex(fill.color));
      }
    }
    if (node.strokes) {
      for (const stroke of node.strokes) {
        if (stroke.color) colors.add(rgbToHex(stroke.color));
      }
    }
    if (node.children) {
      for (const child of node.children) collectColors(child);
    }
  }

  collectColors(root);

  const colorArray = Array.from(colors);
  const nearestColors: Record<string, string> = {};

  for (const hex of colorArray) {
    const nearest = closestTailwindColor(hex, TAILWIND_COLORS);
    nearestColors[nearest] = hex;
  }

  return {
    colors: {
      primary: colorArray[0] || "#3b82f6",
      secondary: colorArray[1] || "#6b7280",
      accent: colorArray[2] || "#8b5cf6",
      background: colorArray[3] || "#ffffff",
      foreground: colorArray[4] || "#171717",
      muted: colorArray[5] || "#a3a3a3",
      border: colorArray[6] || "#e5e7eb",
      destructive: colorArray[7] || "#ef4444",
    },
    typography: {
      fontFamily: "Inter, sans-serif",
      sizes: { sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30 },
      weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    },
    spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
    radii: { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, "2xl": 16, full: 9999 },
  };
}
