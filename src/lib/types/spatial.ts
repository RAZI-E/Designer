export type SemanticTag =
  | "nav"
  | "header"
  | "main"
  | "section"
  | "article"
  | "aside"
  | "footer"
  | "div"
  | "button"
  | "input"
  | "a";

export type PositionMode = "fixed" | "absolute" | "flex" | "grid" | "sticky";

export interface DesktopLayout {
  positionMode: PositionMode;
  coordinates: { x: number; y: number; width: number; height: number };
  viewportPercentage: { top: string; left: string; width: string; height: string };
  margin: [number, number, number, number];
  padding: [number, number, number, number];
  gap?: number;
  alignment: { justify: string; align: string };
  zIndex?: number;
}

export interface MobileLayout {
  positionMode: PositionMode;
  stackDirection: "row" | "col";
  margin: [number, number, number, number];
  padding: [number, number, number, number];
  gap?: number;
  visibility: "visible" | "hidden" | "drawer" | "accordion";
}

export interface BorderRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
  tailwindEquivalent: string;
}

export interface Border {
  width: number;
  style: "solid" | "dashed" | "none";
  color: string;
}

export interface Glow {
  spread: number;
  blur: number;
  color: string;
  tailwindClass: string;
}

export interface Effects {
  boxShadow?: string;
  glow?: Glow;
  backdropBlur?: string;
  opacity: number;
}

export interface Typography {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  lineHeightPx: number;
  letterSpacing: string;
  color: string;
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
}

export interface HoverEffect {
  transform?: string;
  backgroundColor?: string;
  glow?: string;
  cursor: "pointer" | "default";
  transitionDurationMs: number;
}

export interface ActiveClickEffect {
  transform?: string;
  ring?: string;
}

export interface ElementStyling {
  backgroundColor: string;
  borderRadius: BorderRadius;
  border: Border;
  effects: Effects;
  typography?: Typography;
}

export interface ElementInteractions {
  hoverEffect?: HoverEffect;
  activeClickEffect?: ActiveClickEffect;
  focusVisible?: string;
}

export interface ElementSpatialNode {
  id: string;
  name: string;
  semanticTag: SemanticTag;

  layout: {
    desktop_16_9: DesktopLayout;
    mobile_9_16?: MobileLayout;
  };

  styling: ElementStyling;
  interactions: ElementInteractions;
  children?: ElementSpatialNode[];
}

export interface DesignExtractionResult {
  elements: ElementSpatialNode[];
  globalTokens: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
    shadows: string[];
    gradients: string[];
  };
  metadata?: {
    canvasWidth: number;
    canvasHeight: number;
    extractedAt: string;
    elementCount: number;
  };
}

export interface SpecDocument {
  source: "figma" | "psd" | "git" | "vision";
  sourceUrl?: string;
  projectName: string;
  extraction: DesignExtractionResult;
  fileTree?: FileTreeNode[];
  metadata: {
    extractedAt: string;
    sourceWidth: number;
    sourceHeight: number;
    totalElements: number;
  };
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  content?: string;
  language?: string;
}

export interface PromptChunk {
  id: string;
  title: string;
  content: string;
  tokenEstimate: number;
}

export interface GeneratedPrompt {
  fullBlueprint: string;
  chunks: PromptChunk[];
  viewportSetup: string;
  spatialMatrix: string;
  microEffects: string;
  responsiveRules: string;
  codeGenerationSteps: string;
}
