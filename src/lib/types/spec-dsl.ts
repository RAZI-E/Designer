export type LayoutType = "flex" | "grid" | "absolute" | "stack";

export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SpecLayout {
  type: LayoutType;
  direction?: "row" | "column";
  gap: number;
  padding: Spacing;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  columns?: number;
}

export interface SpecStyles {
  colors: Record<string, string>;
  radius: number | string;
  shadow?: string;
  border?: { width: number; color: string };
  opacity?: number;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  fontFamily?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialDistances {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  gap?: number;
}

export type ComponentCategory =
  | "Navbar"
  | "Hero"
  | "Card"
  | "Button"
  | "Form"
  | "Modal"
  | "Footer"
  | "Sidebar"
  | "Input"
  | "Badge"
  | "Avatar"
  | "Table"
  | "List"
  | "Grid"
  | "Section"
  | "Container"
  | "Text"
  | "Image"
  | "Icon"
  | "Divider"
  | "Unknown";

export interface SpecComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  boundingBox: BoundingBox;
  spatialDistances: SpatialDistances;
  layout: SpecLayout;
  styles: SpecStyles;
  children: SpecComponent[];
  textContent?: string;
  componentName?: string;
}

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    destructive: string;
  };
  typography: {
    fontFamily: string;
    sizes: Record<string, number>;
    weights: Record<string, number>;
    lineHeights: Record<string, number>;
  };
  spacing: Record<string, number>;
  radii: Record<string, number>;
}

export interface SpecDocument {
  source: "figma" | "psd" | "git" | "vision";
  sourceUrl?: string;
  projectName: string;
  designTokens: DesignTokens;
  components: SpecComponent[];
  fileTree?: FileTreeNode[];
  metadata: {
    extractedAt: string;
    sourceWidth: number;
    sourceHeight: number;
    totalComponents: number;
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
  systemPrompt: string;
  chunks: PromptChunk[];
  fullMarkdown: string;
  cursorRules: string;
  designTokensMarkdown: string;
  componentGuide: string;
  fileTreeMarkdown: string;
}
