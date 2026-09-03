import type { SpecComponent, ComponentCategory, BoundingBox, SpatialDistances, SpecLayout, SpecStyles, DesignTokens } from "@/lib/types/spec-dsl";
import { generateId, formatComponentName, closestTailwindSpacing, closestTailwindRadius, TAILWIND_COLORS, closestTailwindColor } from "@/lib/utils";

interface VisionDetection {
  label: string;
  category: ComponentCategory;
  bbox: [number, number, number, number];
  confidence: number;
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: number;
    fontSize?: number;
    fontWeight?: number;
    padding?: { top: number; right: number; bottom: number; left: number };
    gap?: number;
    flexDirection?: "row" | "column";
  };
  text?: string;
}

interface SpatialRelationship {
  sourceId: string;
  targetId: string;
  type: "contains" | "adjacent" | "overlaps" | "above" | "below" | "leftOf" | "rightOf";
  distance: number;
}

function calculateSpatialDistancesFromBounds(
  bounds: BoundingBox,
  parentBounds?: BoundingBox
): SpatialDistances {
  if (!parentBounds) {
    return {
      marginTop: bounds.y,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: bounds.x,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    };
  }

  return {
    marginTop: Math.max(0, bounds.y - parentBounds.y),
    marginRight: Math.max(0, parentBounds.x + parentBounds.width - (bounds.x + bounds.width)),
    marginBottom: Math.max(0, parentBounds.y + parentBounds.height - (bounds.y + bounds.height)),
    marginLeft: Math.max(0, bounds.x - parentBounds.x),
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  };
}

function inferLayoutType(
  components: SpecComponent[],
  parentBounds: BoundingBox
): SpecLayout {
  if (components.length === 0) {
    return {
      type: "flex",
      direction: "column",
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  const horizontalVariance = calculateVariance(components.map((c) => c.boundingBox.y));
  const verticalVariance = calculateVariance(components.map((c) => c.boundingBox.x));

  const direction = verticalVariance > horizontalVariance ? "column" : "row";

  const sortedComponents = [...components].sort((a, b) =>
    direction === "row"
      ? a.boundingBox.x - b.boundingBox.x
      : a.boundingBox.y - b.boundingBox.y
  );

  let gap = 0;
  if (sortedComponents.length > 1) {
    const gaps: number[] = [];
    for (let i = 1; i < sortedComponents.length; i++) {
      const prev = sortedComponents[i - 1];
      const curr = sortedComponents[i];

      if (direction === "row") {
        gaps.push(curr.boundingBox.x - (prev.boundingBox.x + prev.boundingBox.width));
      } else {
        gaps.push(curr.boundingBox.y - (prev.boundingBox.y + prev.boundingBox.height));
      }
    }
    gap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  }

  const padding = {
    top: components.length > 0
      ? Math.min(...components.map((c) => c.boundingBox.y)) - parentBounds.y
      : 0,
    right: parentBounds.x + parentBounds.width -
      (components.length > 0
        ? Math.max(...components.map((c) => c.boundingBox.x + c.boundingBox.width))
        : parentBounds.x),
    bottom: parentBounds.y + parentBounds.height -
      (components.length > 0
        ? Math.max(...components.map((c) => c.boundingBox.y + c.boundingBox.height))
        : parentBounds.y),
    left: components.length > 0
      ? Math.min(...components.map((c) => c.boundingBox.x)) - parentBounds.x
      : 0,
  };

  return {
    type: "flex",
    direction,
    gap: closestTailwindSpacing(gap),
    padding: {
      top: closestTailwindSpacing(padding.top),
      right: closestTailwindSpacing(padding.right),
      bottom: closestTailwindSpacing(padding.bottom),
      left: closestTailwindSpacing(padding.left),
    },
    align: "start",
    justify: "start",
  };
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function groupComponentsIntoHierarchy(
  components: SpecComponent[],
  canvasWidth: number,
  canvasHeight: number
): SpecComponent[] {
  if (components.length === 0) return [];

  const sorted = [...components].sort((a, b) => {
    const areaA = a.boundingBox.width * a.boundingBox.height;
    const areaB = b.boundingBox.width * b.boundingBox.height;
    return areaB - areaA;
  });

  const roots: SpecComponent[] = [];
  const assigned = new Set<string>();

  for (const component of sorted) {
    if (assigned.has(component.id)) continue;

    const container = findContainingComponent(component, sorted, assigned);
    if (container) {
      container.children.push(component);
    } else {
      roots.push(component);
    }
    assigned.add(component.id);
  }

  for (const root of roots) {
    if (root.children.length > 1) {
      root.layout = inferLayoutType(root.children, root.boundingBox);
    }
  }

  return roots;
}

function findContainingComponent(
  component: SpecComponent,
  allComponents: SpecComponent[],
  assigned: Set<string>
): SpecComponent | null {
  for (const other of allComponents) {
    if (other.id === component.id || assigned.has(other.id)) continue;

    if (
      component.boundingBox.x >= other.boundingBox.x &&
      component.boundingBox.y >= other.boundingBox.y &&
      component.boundingBox.x + component.boundingBox.width <=
        other.boundingBox.x + other.boundingBox.width &&
      component.boundingBox.y + component.boundingBox.height <=
        other.boundingBox.y + other.boundingBox.height
    ) {
      const areaRatio =
        (component.boundingBox.width * component.boundingBox.height) /
        (other.boundingBox.width * other.boundingBox.height);

      if (areaRatio < 0.8) {
        return other;
      }
    }
  }

  return null;
}

export function analyzeSpatialRelationships(
  detections: Array<{
    bbox: [number, number, number, number];
    category: ComponentCategory;
    label: string;
    confidence: number;
    styles?: Record<string, unknown>;
    text?: string;
  }>,
  canvasWidth: number,
  canvasHeight: number
): SpecComponent[] {
  const components: SpecComponent[] = detections.map((detection) => {
    const bounds: BoundingBox = {
      x: detection.bbox[0],
      y: detection.bbox[1],
      width: detection.bbox[2] - detection.bbox[0],
      height: detection.bbox[3] - detection.bbox[1],
    };

    const styles: SpecStyles = {
      colors: {},
      radius: 0,
    };

    if (detection.styles) {
      const s = detection.styles as Record<string, unknown>;
      if (typeof s.backgroundColor === "string") styles.colors.background = s.backgroundColor;
      if (typeof s.textColor === "string") styles.colors.text = s.textColor;
      if (typeof s.borderColor === "string") styles.colors.border = s.borderColor;
      if (typeof s.borderRadius === "number") styles.radius = closestTailwindRadius(s.borderRadius);
      if (typeof s.fontSize === "number") styles.fontSize = s.fontSize;
      if (typeof s.fontWeight === "number") styles.fontWeight = s.fontWeight;
    }

    return {
      id: generateId(),
      name: detection.label,
      category: detection.category,
      boundingBox: bounds,
      spatialDistances: calculateSpatialDistancesFromBounds(bounds, {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
      }),
      layout: {
        type: "absolute" as const,
        gap: 0,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      },
      styles,
      children: [],
      textContent: detection.text,
      componentName: formatComponentName(detection.label),
    };
  });

  return groupComponentsIntoHierarchy(components, canvasWidth, canvasHeight);
}

export function normalizeDesignTokens(
  components: SpecComponent[],
  detectedColors: string[],
  detectedFonts: Array<{ family: string; size: number; weight: number }>
): DesignTokens {
  const uniqueColors = [...new Set(detectedColors)];

  const nearestColors: Record<string, string> = {};
  for (const color of uniqueColors) {
    const nearest = closestTailwindColor(color, TAILWIND_COLORS);
    nearestColors[nearest] = color;
  }

  const primaryColor = uniqueColors[0] || "#3b82f6";
  const secondaryColor = uniqueColors[1] || "#6b7280";

  return {
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: uniqueColors[2] || "#8b5cf6",
      background: uniqueColors.find((c) => {
        const rgb = hexToRgb(c);
        return rgb && rgb.r > 200 && rgb.g > 200 && rgb.b > 200;
      }) || "#ffffff",
      foreground: uniqueColors.find((c) => {
        const rgb = hexToRgb(c);
        return rgb && rgb.r < 50 && rgb.g < 50 && rgb.b < 50;
      }) || "#171717",
      muted: uniqueColors[3] || "#a3a3a3",
      border: uniqueColors[4] || "#e5e7eb",
      destructive: uniqueColors[5] || "#ef4444",
    },
    typography: {
      fontFamily: detectedFonts[0]?.family || "Inter, sans-serif",
      sizes: {
        sm: 14,
        base: detectedFonts[0]?.size || 16,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 30,
      },
      weights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: detectedFonts[0]?.weight || 700,
      },
      lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    },
    spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
    radii: { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, "2xl": 16, full: 9999 },
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
