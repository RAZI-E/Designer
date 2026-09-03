import { readPsd, Psd, Layer } from "ag-psd";
import type { SpecComponent, ComponentCategory, BoundingBox, SpatialDistances, SpecLayout, SpecStyles } from "@/lib/types/spec-dsl";
import { generateId, formatComponentName } from "@/lib/utils";

interface PSDLayerInfo {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  children?: PSDLayerInfo[];
  text?: string;
  isVisible: boolean;
}

function categorizeLayer(name: string): ComponentCategory {
  const lower = name.toLowerCase();
  if (lower.includes("nav") || lower.includes("header") || lower.includes("menu")) return "Navbar";
  if (lower.includes("hero") || lower.includes("banner") || lower.includes("jumbotron")) return "Hero";
  if (lower.includes("card") || lower.includes("tile") || lower.includes("item")) return "Card";
  if (lower.includes("btn") || lower.includes("button") || lower.includes("cta")) return "Button";
  if (lower.includes("form") || lower.includes("field") || lower.includes("input")) return "Form";
  if (lower.includes("modal") || lower.includes("dialog") || lower.includes("popup")) return "Modal";
  if (lower.includes("footer") || lower.includes("bottom")) return "Footer";
  if (lower.includes("sidebar") || lower.includes("side") || lower.includes("panel")) return "Sidebar";
  if (lower.includes("input") || lower.includes("text") || lower.includes("textarea")) return "Input";
  if (lower.includes("badge") || lower.includes("tag") || lower.includes("label")) return "Badge";
  if (lower.includes("avatar") || lower.includes("profile") || lower.includes("photo")) return "Avatar";
  if (lower.includes("table") || lower.includes("grid") || lower.includes("row")) return "Table";
  if (lower.includes("list") || lower.includes("menu")) return "List";
  if (lower.includes("section") || lower.includes("block")) return "Section";
  if (lower.includes("container") || lower.includes("wrapper") || lower.includes("frame")) return "Container";
  if (lower.includes("text") || lower.includes("label") || lower.includes("heading")) return "Text";
  if (lower.includes("image") || lower.includes("img") || lower.includes("icon") || lower.includes("logo")) return "Image";
  if (lower.includes("divider") || lower.includes("separator") || lower.includes("line")) return "Divider";
  return "Unknown";
}

function extractLayersRecursive(layer: Layer): PSDLayerInfo | null {
  if (!layer.name && !layer.children?.length) return null;

  const info: PSDLayerInfo = {
    name: layer.name || "Unnamed",
    left: layer.left || 0,
    top: layer.top || 0,
    width: (layer.right || 0) - (layer.left || 0),
    height: (layer.bottom || 0) - (layer.top || 0),
    isVisible: layer.hidden !== true,
  };

  if (layer.text?.text) {
    info.text = layer.text.text;
  }

  if (layer.children && layer.children.length > 0) {
    info.children = layer.children
      .map((child) => extractLayersRecursive(child))
      .filter((child): child is PSDLayerInfo => child !== null);
  }

  return info;
}

function calculateSpatialDistances(layer: PSDLayerInfo, parentBounds?: BoundingBox): SpatialDistances {
  const parentTop = parentBounds?.y ?? 0;
  const parentLeft = parentBounds?.x ?? 0;
  const parentWidth = parentBounds?.width ?? layer.width;
  const parentHeight = parentBounds?.height ?? layer.height;

  return {
    marginTop: Math.max(0, layer.top - parentTop),
    marginRight: Math.max(0, parentLeft + parentWidth - (layer.left + layer.width)),
    marginBottom: Math.max(0, parentTop + parentHeight - (layer.top + layer.height)),
    marginLeft: Math.max(0, layer.left - parentLeft),
    paddingTop: layer.top - parentTop,
    paddingRight: parentLeft + parentWidth - (layer.left + layer.width),
    paddingBottom: parentTop + parentHeight - (layer.top + layer.height),
    paddingLeft: layer.left - parentLeft,
  };
}

function buildSpecComponent(layer: PSDLayerInfo, index: number, parentBounds?: BoundingBox): SpecComponent {
  const bounds: BoundingBox = {
    x: layer.left,
    y: layer.top,
    width: layer.width,
    height: layer.height,
  };

  const spatialDistances = calculateSpatialDistances(layer, parentBounds);

  const layout: SpecLayout = {
    type: layer.children && layer.children.length > 0 ? "flex" : "absolute",
    direction: "column",
    gap: 0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };

  const styles: SpecStyles = {
    colors: {},
    radius: 0,
  };

  return {
    id: generateId(),
    name: layer.name,
    category: categorizeLayer(layer.name),
    boundingBox: bounds,
    spatialDistances,
    layout,
    styles,
    children: layer.children
      ? layer.children.map((child, i) => buildSpecComponent(child, i, bounds))
      : [],
    textContent: layer.text,
    componentName: formatComponentName(layer.name),
  };
}

export async function parsePSD(buffer: ArrayBuffer): Promise<{
  components: SpecComponent[];
  width: number;
  height: number;
}> {
  const psd = readPsd(buffer);

  const width = psd.width;
  const height = psd.height;

  const rootLayer: PSDLayerInfo = {
    name: psd.name || "Root",
    left: 0,
    top: 0,
    width,
    height,
    isVisible: true,
    children: [],
  };

  if (psd.children) {
    rootLayer.children = psd.children
      .map((child) => extractLayersRecursive(child))
      .filter((child): child is PSDLayerInfo => child !== null);
  }

  const components: SpecComponent[] = rootLayer.children
    ? rootLayer.children.map((child, i) => buildSpecComponent(child, i))
    : [];

  return { components, width, height };
}
