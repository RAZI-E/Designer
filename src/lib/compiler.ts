import type {
  ElementSpatialNode,
  DesignExtractionResult,
  PromptChunk,
  GeneratedPrompt,
  SpecDocument,
  FileTreeNode,
  GitAnalysisData,
} from "@/lib/types/spatial";
import { DESKTOP_REFERENCE, MOBILE_REFERENCE } from "@/lib/gemini-spatial";

export function compileBlueprintToMarkdown(ast: any): string {
  const { theme, typography, backgroundArtAndDecorations, components } = ast || {};

  return `# High-Precision Execution Blueprint (Verbatim Rebuild)

## CRITICAL EXECUTION RULES (STRICT ENFORCEMENT)
1. ZERO INVENTED STYLES: Do NOT use default component libraries (Shadcn/Bootstrap/Tailwind defaults) unless they match the exact classes specified below.
2. MORPHOLOGY ADHERENCE: If an item is an "Inline Trigger List", DO NOT wrap it in a card or button box. Keep it borderless with vertical tick dividers as specified.
3. ART & ASSET ACCURACY: Reconstruct decorative assets (3D meshes, spheres, gradients) using the exact colors and SVG/CSS strategies defined in Section 2. Do not substitute with gray wireframe spheres or stock icons.
4. TEXT CUTOFFS & WATERMARKS: Watermark elements must retain their huge scale and baseline viewport clipping.

---

## 1. Global Setup & Design Tokens

### Fonts:
Add these to \`app/layout.tsx\` or your global stylesheet:
- **Heading Font:** \`${typography?.suggestedGoogleFontHeading || "Inter"}\` (\`${typography?.headerStyle || "normal"}\`)
- **Body Font:** \`${typography?.suggestedGoogleFontBody || "Inter"}\`

### Canvas & Theme Tokens:
- **Background Base:** \`${theme?.backgroundBaseHex || "#000000"}\`
${theme?.hasGradient ? `- **Background Gradient:** \`${theme.gradientCss}\`` : ""}
${theme?.overlayTexture && theme.overlayTexture !== "none" ? `- **Overlay Texture/Pattern:** \`${theme.overlayTexture}\`` : ""}
- **Primary Accent:** \`${theme?.primaryAccentHex || "#3b82f6"}\`
- **Text Primary:** \`${theme?.textPrimaryHex || "#ffffff"}\`
- **Text Secondary:** \`${theme?.textSecondaryHex || "#a1a1aa"}\`

---

## 2. Background Art, 3D Assets & Ambient Layers
${(backgroundArtAndDecorations || []).map((art: any, i: number) => `
### Layer ${i + 1}: ${art.name}
- **Colors:** ${(art.colorPalette || []).join(", ")}
- **Positioning:** \`top: ${art.coordinates?.top}\`, \`left: ${art.coordinates?.left}\`, \`width: ${art.coordinates?.width}\`, \`height: ${art.coordinates?.height}\`, \`z-index: ${art.coordinates?.zIndex}\`
- **Rendering Strategy:** ${art.renderingStrategy}
`).join("\n")}

---

## 3. Component Matrix & Exact Morphologies

| Component | Target Morphology | Exact Visible Copy | Recommended Tailwind Classes |
| :--- | :--- | :--- | :--- |
${(components || []).map((c: any) => `| **${c.type}** | ${c.morphology} | \`${(c.exactContent || "").replace(/\n/g, " ")}\` | \`${c.cssClassesTailwind}\` |`).join("\n")}

---

## 4. Layout Assembly Instructions

Follow this structural assembly order in your main page component:

\`\`\`tsx
export default function Page() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: '${theme?.backgroundBaseHex || "#000000"}' }}>
      {/* 1. Background Layers & Art */}
      ${(backgroundArtAndDecorations || []).map((art: any) => `
      {/* ${art.name} */}
      <div 
        className="pointer-events-none absolute"
        style={{
          top: '${art.coordinates?.top}',
          left: '${art.coordinates?.left}',
          width: '${art.coordinates?.width}',
          height: '${art.coordinates?.height}',
          zIndex: ${art.coordinates?.zIndex},
        }}
      >
        {/* Render: ${art.renderingStrategy} */}
      </div>`).join("\n")}

      {/* 2. Primary UI Components */}
      <div className="relative z-20 flex flex-col min-h-screen">
        {/* Inject Header, Hero, and Triggers here using the exact Tailwind classes defined in Section 3 */}
      </div>
    </main>
  );
}
\`\`\`

---

## 5. Verification Checklist for Agent
Before concluding your response:
- [ ] Confirm typography imports match \`${typography?.suggestedGoogleFontHeading || "Inter"}\`.
- [ ] Ensure all action triggers match their specific morphology (no unwanted borders or boxed card wrappers).
- [ ] Verify that background art elements use their exact specified colors (${theme?.primaryAccentHex || "#3b82f6"}) rather than monochromatic placeholders.
`;
}


function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatMargin(m: [number, number, number, number]): string {
  return `${m[0]}px ${m[1]}px ${m[2]}px ${m[3]}px`;
}

function formatPadding(p: [number, number, number, number]): string {
  return `${p[0]}px ${p[1]}px ${p[2]}px ${p[3]}px`;
}

function escapeText(str?: string): string {
  if (!str) return "";
  return str.replace(/"/g, '\\"').replace(/\n/g, " ");
}

/**
 * Recursively flatten the element tree into a row list with tree indentation
 */
function renderSpatialMatrixRows(elements: ElementSpatialNode[], depth: number = 0): string {
  let rows = "";
  const indent = "— ".repeat(depth);

  for (const el of elements) {
    const d = el.layout.desktop_16_9;
    const m = d.margin;
    const p = d.padding;
    const r = el.styling.borderRadius;
    const radiusStr = r.tailwindEquivalent || (r.topLeft ? `${r.topLeft}px` : "none");
    const namePrefix = depth > 0 ? `${indent}${el.name}` : `**${el.name}**`;
    const tag = `\`<${el.semanticTag}>\``;
    const pos = `x:${d.coordinates.x} y:${d.coordinates.y} w:${d.coordinates.width} h:${d.coordinates.height}`;
    const pad = `${p[0]}/${p[1]}/${p[2]}/${p[3]}px`;
    const mar = `${m[0]}/${m[1]}/${m[2]}/${m[3]}px`;
    const gap = d.gap ? `${d.gap}px` : "-";
    const type = el.componentType ? el.componentType : "-";
    const textPreview = el.textContent ? `"${escapeText(el.textContent.slice(0, 30))}${el.textContent.length > 30 ? "..." : ""}"` : "-";

    rows += `| ${namePrefix} | ${tag} | ${type} | ${pos} | ${pad} | ${mar} | ${gap} | ${radiusStr} | ${textPreview} |\n`;

    if (el.children && el.children.length > 0) {
      rows += renderSpatialMatrixRows(el.children, depth + 1);
    }
  }

  return rows;
}

function renderElementEffects(el: ElementSpatialNode, depth: number = 0): string {
  const indent = "  ".repeat(depth);
  const s = el.styling;
  const i = el.interactions;
  let md = "";

  const typeDesc = el.componentType ? ` [${el.componentType}]` : "";
  md += `${indent}- **${el.name}** (\`<${el.semanticTag}>\`${typeDesc})\n`;

  if (el.textContent) {
    md += `${indent}  - **Exact Text Content:** "${escapeText(el.textContent)}"\n`;
  }

  const d = el.layout.desktop_16_9;
  md += `${indent}  - **Coordinates & Bounds:** \`${d.coordinates.width}x${d.coordinates.height}px\` at \`(x: ${d.coordinates.x}, y: ${d.coordinates.y})\` (Viewport: ${d.viewportPercentage.width} width, ${d.viewportPercentage.left} left)\n`;
  md += `${indent}  - **Layout Mode:** Position: \`${d.positionMode}\`, Align: \`${d.alignment.align}\`, Justify: \`${d.alignment.justify}\`${d.gap ? `, Gap: \`${d.gap}px\`` : ""}\n`;
  md += `${indent}  - **Spacing:** Padding: \`${formatPadding(d.padding)}\`, Margin: \`${formatMargin(d.margin)}\`\n`;

  if (s.backgroundColor && s.backgroundColor !== "transparent") {
    md += `${indent}  - **Background:** \`${s.backgroundColor}\`\n`;
  }

  if (s.border.width > 0 && s.border.style !== "none") {
    md += `${indent}  - **Border:** \`${s.border.width}px ${s.border.style} ${s.border.color}\`\n`;
  }

  const r = s.borderRadius;
  if (r.topLeft > 0 || r.topRight > 0 || r.bottomRight > 0 || r.bottomLeft > 0) {
    md += `${indent}  - **Corner Radius:** \`${r.topLeft}px\` (\`${r.tailwindEquivalent}\`)\n`;
  }

  if (s.effects.boxShadow) {
    md += `${indent}  - **Box Shadow:** \`${s.effects.boxShadow}\`\n`;
  }

  if (s.effects.glow) {
    md += `${indent}  - **Glow / Ring:** \`${s.effects.glow.tailwindClass}\` (Spread: ${s.effects.glow.spread}px, Blur: ${s.effects.glow.blur}px, Color: \`${s.effects.glow.color}\`)\n`;
  }

  if (s.effects.backdropBlur) {
    md += `${indent}  - **Backdrop Blur:** \`${s.effects.backdropBlur}\`\n`;
  }

  if (s.effects.opacity < 1) {
    md += `${indent}  - **Opacity:** \`${s.effects.opacity}\`\n`;
  }

  if (s.typography) {
    const t = s.typography;
    md += `${indent}  - **Typography:** Font: \`${t.fontFamily}\`, Size: \`${t.fontSizePx}px\`, Weight: \`${t.fontWeight}\`, Line-Height: \`${t.lineHeightPx}px\`, Color: \`${t.color}\`\n`;
    if (t.letterSpacing !== "normal" && t.letterSpacing !== "0em") {
      md += `${indent}    - Letter Spacing: \`${t.letterSpacing}\`\n`;
    }
    if (t.textTransform && t.textTransform !== "none") {
      md += `${indent}    - Text Transform: \`${t.textTransform}\`\n`;
    }
  }

  if (i.hoverEffect) {
    const h = i.hoverEffect;
    let hoverStr = `transition-all duration-${h.transitionDurationMs}ms cursor-${h.cursor}`;
    if (h.transform) hoverStr += ` hover:${h.transform}`;
    if (h.backgroundColor) hoverStr += ` hover:bg-[${h.backgroundColor}]`;
    if (h.glow) hoverStr += ` ${h.glow}`;
    md += `${indent}  - **Hover State:** \`${hoverStr}\`\n`;
  }

  if (i.activeClickEffect) {
    const a = i.activeClickEffect;
    let activeStr = "";
    if (a.transform) activeStr += `active:${a.transform}`;
    if (a.ring) activeStr += ` ${a.ring}`;
    md += `${indent}  - **Active/Click State:** \`${activeStr}\`\n`;
  }

  if (i.focusVisible) {
    md += `${indent}  - **Focus State:** \`${i.focusVisible}\`\n`;
  }

  if (el.children && el.children.length > 0) {
    for (const child of el.children) {
      md += renderElementEffects(child, depth + 1);
    }
  }

  return md;
}

function renderResponsiveRules(elements: ElementSpatialNode[]): string {
  let md = "";

  function processNode(el: ElementSpatialNode) {
    const d = el.layout.desktop_16_9;
    const m = el.layout.mobile_9_16;

    if (m) {
      const dDir = d.positionMode === "flex" ? "row" : "col";
      const mDir = m.stackDirection;

      if (dDir !== mDir) {
        md += `- **${el.name}**: Desktop \`flex-row\` ➔ Mobile \`${mDir === "col" ? "flex-col" : "flex-row"}\`\n`;
      }

      if (m.visibility !== "visible") {
        md += `- **${el.name}**: Mobile Visibility: \`${m.visibility}\` (Collapse into drawer or mobile menu)\n`;
      }

      const dGap = d.gap || 0;
      const mGap = m.gap || 0;
      if (dGap !== mGap && (dGap > 0 || mGap > 0)) {
        md += `- **${el.name}**: Gap \`${dGap}px\` (Desktop) ➔ \`${mGap}px\` (Mobile)\n`;
      }

      const dPad = d.padding;
      const mPad = m.padding;
      if (dPad.join(",") !== mPad.join(",")) {
        md += `- **${el.name}**: Padding \`${formatPadding(dPad)}\` ➔ Mobile \`${formatPadding(mPad)}\`\n`;
      }
    }

    if (el.children) {
      for (const child of el.children) {
        processNode(child);
      }
    }
  }

  for (const el of elements) {
    processNode(el);
  }

  return md;
}

function buildTailwindClasses(el: ElementSpatialNode): string {
  const classes: string[] = [];
  const d = el.layout.desktop_16_9;
  const s = el.styling;

  if (d.positionMode === "flex") classes.push("flex");
  else if (d.positionMode === "grid") classes.push("grid");
  else if (d.positionMode === "sticky") classes.push("sticky top-0 z-40");
  else if (d.positionMode === "absolute") classes.push("absolute");

  // Flex alignment
  if (d.positionMode === "flex") {
    if (d.alignment.align === "center") classes.push("items-center");
    else if (d.alignment.align === "end") classes.push("items-end");
    else if (d.alignment.align === "stretch") classes.push("items-stretch");

    if (d.alignment.justify === "center") classes.push("justify-center");
    else if (d.alignment.justify === "end") classes.push("justify-end");
    else if (d.alignment.justify === "between") classes.push("justify-between");
    else if (d.alignment.justify === "around") classes.push("justify-around");
  }

  // Margin
  const m = d.margin;
  if (m[0] > 0 && d.positionMode !== "absolute") classes.push(`mt-[${m[0]}px]`);
  if (m[1] > 0 && d.positionMode !== "absolute") classes.push(`mr-[${m[1]}px]`);
  if (m[2] > 0 && d.positionMode !== "absolute") classes.push(`mb-[${m[2]}px]`);
  if (m[3] > 0 && d.positionMode !== "absolute") classes.push(`ml-[${m[3]}px]`);

  // Padding
  const p = d.padding;
  if (p[0] > 0 || p[1] > 0 || p[2] > 0 || p[3] > 0) {
    if (p[0] === p[1] && p[1] === p[2] && p[2] === p[3]) {
      classes.push(`p-[${p[0]}px]`);
    } else {
      if (p[0] > 0) classes.push(`pt-[${p[0]}px]`);
      if (p[1] > 0) classes.push(`pr-[${p[1]}px]`);
      if (p[2] > 0) classes.push(`pb-[${p[2]}px]`);
      if (p[3] > 0) classes.push(`pl-[${p[3]}px]`);
    }
  }

  // Gap
  if (d.gap && d.gap > 0) classes.push(`gap-[${d.gap}px]`);

  // Border radius
  const r = s.borderRadius;
  if (r.topLeft === r.topRight && r.topRight === r.bottomRight && r.bottomRight === r.bottomLeft) {
    if (r.topLeft > 0) classes.push(r.tailwindEquivalent || `rounded-[${r.topLeft}px]`);
  } else {
    if (r.topLeft) classes.push(`rounded-tl-[${r.topLeft}px]`);
    if (r.topRight) classes.push(`rounded-tr-[${r.topRight}px]`);
    if (r.bottomRight) classes.push(`rounded-br-[${r.bottomRight}px]`);
    if (r.bottomLeft) classes.push(`rounded-bl-[${r.bottomLeft}px]`);
  }

  // Background
  if (s.backgroundColor && s.backgroundColor !== "transparent") {
    if (s.backgroundColor.startsWith("#") || s.backgroundColor.startsWith("rgb")) {
      classes.push(`bg-[${s.backgroundColor}]`);
    }
  }

  // Border
  if (s.border.width > 0 && s.border.style !== "none") {
    classes.push(`border border-[${s.border.color}]`);
  }

  // Shadow
  if (s.effects.boxShadow) {
    classes.push(`shadow-[${s.effects.boxShadow}]`);
  }

  if (s.effects.glow) {
    classes.push(s.effects.glow.tailwindClass);
  }

  if (s.effects.backdropBlur) {
    classes.push(s.effects.backdropBlur);
  }

  if (s.effects.opacity < 1) {
    classes.push(`opacity-${Math.round(s.effects.opacity * 100)}`);
  }

  // Typography
  if (s.typography) {
    const t = s.typography;
    const sizeMap: Record<number, string> = {
      10: "text-[10px]",
      12: "text-xs",
      14: "text-sm",
      16: "text-base",
      18: "text-lg",
      20: "text-xl",
      24: "text-2xl",
      30: "text-3xl",
      36: "text-4xl",
      48: "text-5xl",
      64: "text-6xl",
    };
    classes.push(sizeMap[t.fontSizePx] || `text-[${t.fontSizePx}px]`);

    const weightMap: Record<number, string> = {
      300: "font-light",
      400: "font-normal",
      500: "font-medium",
      600: "font-semibold",
      700: "font-bold",
      800: "font-extrabold",
    };
    classes.push(weightMap[t.fontWeight] || `font-[${t.fontWeight}]`);

    if (t.color && t.color !== "#000000") {
      classes.push(`text-[${t.color}]`);
    }

    if (t.textTransform && t.textTransform !== "none") {
      classes.push(t.textTransform);
    }
  }

  // Interactions
  const i = el.interactions;
  if (i.hoverEffect) {
    if (i.hoverEffect.cursor === "pointer") classes.push("cursor-pointer");
    if (i.hoverEffect.transform) classes.push(`hover:${i.hoverEffect.transform}`);
    if (i.hoverEffect.backgroundColor) classes.push(`hover:bg-[${i.hoverEffect.backgroundColor}]`);
    if (i.hoverEffect.glow) classes.push(i.hoverEffect.glow);
    classes.push(`transition-all duration-${i.hoverEffect.transitionDurationMs || 200}`);
  }

  if (i.activeClickEffect) {
    if (i.activeClickEffect.transform) classes.push(`active:${i.activeClickEffect.transform}`);
    if (i.activeClickEffect.ring) classes.push(i.activeClickEffect.ring);
  }

  return classes.join(" ");
}

function mapTag(el: ElementSpatialNode): string {
  const tag = el.semanticTag;
  const compType = (el.componentType || "").toLowerCase();
  const name = el.name.toLowerCase();

  if (tag === "button" || compType.includes("button") || name.includes("btn") || name.includes("button")) {
    return "button";
  }
  if (tag === "input" || compType.includes("input") || name.includes("input") || name.includes("search")) {
    return "input";
  }
  if (tag === "a" || compType.includes("link") || name.includes("link")) {
    return "a";
  }
  if (tag === "nav" || compType.includes("navbar") || name.includes("navbar")) {
    return "nav";
  }
  if (tag === "header" || compType.includes("header") || name.includes("header")) {
    return "header";
  }
  if (tag === "footer" || compType.includes("footer") || name.includes("footer")) {
    return "footer";
  }
  if (tag === "main") return "main";
  if (tag === "section" || compType.includes("section") || compType.includes("hero")) return "section";
  if (tag === "article" || compType.includes("card")) return "article";
  if (tag === "aside" || compType.includes("sidebar")) return "aside";

  // Check typography heading sizes
  if (el.styling.typography) {
    const size = el.styling.typography.fontSizePx;
    if (size >= 36) return "h1";
    if (size >= 28) return "h2";
    if (size >= 22) return "h3";
    if (size >= 18) return "h4";
    if (el.textContent && !el.children?.length) return "p";
  }

  return "div";
}

/**
 * Recursively generate clean JSX skeleton with real text contents and child elements
 */
function renderJsxElement(el: ElementSpatialNode, indentSpaces: number = 6): string {
  const indent = " ".repeat(indentSpaces);
  const tag = mapTag(el);
  const classes = buildTailwindClasses(el);
  const classAttr = classes ? ` className="${classes}"` : "";

  // If leaf element with text
  if (el.textContent && (!el.children || el.children.length === 0)) {
    if (tag === "input") {
      return `${indent}<input${classAttr} type="text" placeholder="${escapeText(el.textContent)}" />\n`;
    }
    if (tag === "button") {
      return `${indent}<button${classAttr} type="button">${el.textContent}</button>\n`;
    }
    if (tag === "a") {
      return `${indent}<a href="#"${classAttr}>${el.textContent}</a>\n`;
    }
    return `${indent}<${tag}${classAttr}>${el.textContent}</${tag}>\n`;
  }

  // If has children
  if (el.children && el.children.length > 0) {
    let out = `${indent}<${tag}${classAttr}>\n`;
    if (el.textContent) {
      out += `${indent}  <span className="sr-only">${escapeText(el.textContent)}</span>\n`;
    }
    for (const child of el.children) {
      out += renderJsxElement(child, indentSpaces + 2);
    }
    out += `${indent}</${tag}>\n`;
    return out;
  }

  // Self closing or empty container
  return `${indent}<${tag}${classAttr}>{/* ${el.name} */}</${tag}>\n`;
}

function renderFileTreeMarkdown(fileTree: FileTreeNode[], indent: number = 0): string {
  let md = "";
  const prefix = "  ".repeat(indent);

  for (const node of fileTree) {
    if (node.type === "directory") {
      md += `${prefix}📁 ${node.name}/\n`;
      if (node.children) {
        md += renderFileTreeMarkdown(node.children, indent + 1);
      }
    } else {
      md += `${prefix}📄 ${node.name}\n`;
    }
  }

  return md;
}

function buildCodeGenerationSteps(
  elements: ElementSpatialNode[],
  globalTokens: DesignExtractionResult["globalTokens"],
  projectName: string
): string {
  let md = "";

  md += `### Step 1: Tailwind Config & Global CSS Tokens\n\n`;
  md += "```css\n";
  md += "/* app/globals.css */\n";
  md += "@import \"tailwindcss\";\n\n";
  md += "@theme {\n";
  for (const [name, value] of Object.entries(globalTokens.colors)) {
    const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    md += `  --color-${cleanName}: ${value};\n`;
  }
  md += "}\n\n";
  md += ":root {\n";
  for (const [name, value] of Object.entries(globalTokens.colors)) {
    const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    md += `  --${cleanName}: ${value};\n`;
  }
  md += "}\n";
  md += "```\n\n";

  md += `### Step 2: Complete Production-Ready Page Implementation\n\n`;
  md += "```tsx\n";
  md += "import React from 'react';\n";
  md += "import { Sparkles, ArrowRight, Check, Menu, X, Search, ChevronRight } from 'lucide-react';\n\n";
  md += `export default function ${projectName.replace(/[^a-zA-Z0-9]/g, "") || "Page"}() {\n`;
  md += "  return (\n";
  md += '    <main className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-start overflow-x-hidden">\n';

  for (const el of elements) {
    md += renderJsxElement(el, 6);
  }

  md += "    </main>\n";
  md += "  );\n";
  md += "}\n";
  md += "```\n\n";

  md += `### Step 3: Deep Component Breakdown & Spatial Coordinates\n\n`;
  for (const el of elements) {
    md += renderComponentDetails(el, 0);
  }

  return md;
}

function renderComponentDetails(el: ElementSpatialNode, depth: number = 0): string {
  const d = el.layout.desktop_16_9;
  const m = el.layout.mobile_9_16;
  const indent = "  ".repeat(depth);
  let md = "";

  const headingPrefix = depth === 0 ? "####" : `${indent}-`;
  const typeDesc = el.componentType ? ` [${el.componentType}]` : "";
  md += `${headingPrefix} **${el.name}** (\`<${el.semanticTag}>\`${typeDesc})\n\n`;
  md += `${indent}  - **Coordinates:** \`x: ${d.coordinates.x}px\`, \`y: ${d.coordinates.y}px\` | **Dimensions:** \`${d.coordinates.width}px\` × \`${d.coordinates.height}px\`\n`;
  md += `${indent}  - **Layout:** Position mode: \`${d.positionMode}\`, Justify: \`${d.alignment.justify}\`, Align: \`${d.alignment.align}\`\n`;
  md += `${indent}  - **Spacing:** Padding: \`${formatPadding(d.padding)}\`, Margin: \`${formatMargin(d.margin)}\`${d.gap ? `, Gap: \`${d.gap}px\`` : ""}\n`;
  
  if (el.textContent) {
    md += `${indent}  - **Exact Copy / Content:** "${escapeText(el.textContent)}"\n`;
  }
  if (el.styling.typography) {
    const t = el.styling.typography;
    md += `${indent}  - **Typography:** \`${t.fontFamily}\` ${t.fontSizePx}px / weight:${t.fontWeight} / color:\`${t.color}\`\n`;
  }
  if (el.styling.backgroundColor !== "transparent") {
    md += `${indent}  - **Background:** \`${el.styling.backgroundColor}\`\n`;
  }
  if (el.styling.borderRadius.topLeft > 0) {
    md += `${indent}  - **Border Radius:** \`${el.styling.borderRadius.topLeft}px\` (\`${el.styling.borderRadius.tailwindEquivalent}\`)\n`;
  }
  if (el.styling.border.width > 0) {
    md += `${indent}  - **Border:** \`${el.styling.border.width}px ${el.styling.border.style} ${el.styling.border.color}\`\n`;
  }
  if (el.styling.effects.boxShadow) {
    md += `${indent}  - **Shadow:** \`${el.styling.effects.boxShadow}\`\n`;
  }
  if (m) {
    md += `${indent}  - **Mobile Adaptation:** Stack: \`${m.stackDirection}\`, Visibility: \`${m.visibility}\`${m.gap ? `, Mobile Gap: \`${m.gap}px\`` : ""}\n`;
  }
  md += "\n";

  if (el.children && el.children.length > 0) {
    for (const child of el.children) {
      md += renderComponentDetails(child, depth + 1);
    }
  }

  return md;
}

function chunkPrompt(blueprint: string, maxTokens: number = 4000): PromptChunk[] {
  const chunks: PromptChunk[] = [];
  const sections = blueprint.split(/\n(?=## )/);
  let current = "";
  let currentTokens = 0;

  for (const section of sections) {
    const tokens = estimateTokens(section);
    if (currentTokens + tokens > maxTokens && current.length > 0) {
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        title: `Section ${chunks.length + 1}`,
        content: current.trim(),
        tokenEstimate: currentTokens,
      });
      current = "";
      currentTokens = 0;
    }
    current += section + "\n";
    currentTokens += tokens;
  }

  if (current.trim()) {
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      title: `Section ${chunks.length + 1}`,
      content: current.trim(),
      tokenEstimate: currentTokens,
    });
  }

  return chunks;
}

export function compileBlueprint(doc: SpecDocument): GeneratedPrompt {
  const { extraction, projectName, source, sourceUrl, gitData, fileTree } = doc;
  const elements = extraction.elements;
  const tokens = extraction.globalTokens;

  // 1. AI System Directives & Context Setup
  let viewportSetup = `## 1. Project Context & Master Viewport Setup\n\n`;
  viewportSetup += `- **Project Name:** \`${projectName}\`\n`;
  viewportSetup += `- **Design Source:** \`${source.toUpperCase()}\`${sourceUrl ? ` (${sourceUrl})` : ""}\n`;
  viewportSetup += `- **Tech Stack Target:** Next.js (App Router), React 19, Tailwind CSS, TypeScript, Lucide Icons\n`;
  viewportSetup += `- **Analysis Timestamp:** \`${doc.metadata.extractedAt}\`\n\n`;

  // First check if elements have root artboard containers
  if (elements.length > 0) {
    const primary = elements[0];
    const d = primary.layout.desktop_16_9;
    viewportSetup += `### Master Artboard Canvas Boundaries\n`;
    viewportSetup += `- **Master Artboard Canvas:** \`${d.coordinates.width}px\` × \`${d.coordinates.height}px\` (Aspect ratio ~${(d.coordinates.width / d.coordinates.height).toFixed(2)})\n`;
    viewportSetup += `- **Root Frame Name:** \`${primary.name}\` (\`<${primary.semanticTag}>\`)\n`;
    if (primary.styling.backgroundColor && primary.styling.backgroundColor !== "transparent") {
      viewportSetup += `- **Canvas Background Color:** \`${primary.styling.backgroundColor}\`\n`;
    }
    viewportSetup += `- **Outer Container Padding:** \`${formatPadding(d.padding)}\`\n`;
    viewportSetup += `- **Target Reference Viewports:** Desktop base \`${d.coordinates.width}px\`, Mobile base \`${MOBILE_REFERENCE.width}px\`\n\n`;
  } else {
    viewportSetup += `### Master Artboard Canvas Boundaries\n`;
    viewportSetup += `- **Desktop Target (16:9):** Max width \`${DESKTOP_REFERENCE.width}px\`, base canvas \`${DESKTOP_REFERENCE.width}x${DESKTOP_REFERENCE.height}\`.\n`;
    viewportSetup += `- **Mobile Target (9:16):** Base width \`${MOBILE_REFERENCE.width}px\` to \`${MOBILE_REFERENCE.width + 40}px\`, vertical flow.\n\n`;
  }

  viewportSetup += `### Global Design Tokens & Palette System\n\n`;
  if (Object.keys(tokens.colors).length > 0) {
    viewportSetup += `#### Color Palette Table\n`;
    viewportSetup += `| Token Name | Hex / RGBA Value | CSS Variable | Semantic Usage |\n`;
    viewportSetup += `|---|---|---|---|\n`;
    for (const [name, value] of Object.entries(tokens.colors)) {
      const cleanName = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
      const usage = cleanName.includes("bg") || cleanName.includes("background")
        ? "Page & Card Backgrounds"
        : cleanName.includes("text") || cleanName.includes("fg") || cleanName.includes("foreground")
        ? "Primary & Secondary Typography"
        : cleanName.includes("primary") || cleanName.includes("cta") || cleanName.includes("btn")
        ? "Primary Action Buttons & Active Highlights"
        : cleanName.includes("border") || cleanName.includes("stroke")
        ? "Borders & Dividers"
        : "Accents, Badges & Micro-Glows";
      viewportSetup += `| \`${name}\` | \`${value}\` | \`--${cleanName}\` | ${usage} |\n`;
    }
    viewportSetup += `\n`;
  }

  if (Object.keys(tokens.fonts).length > 0) {
    viewportSetup += `#### Typography Font Families\n`;
    for (const [name, value] of Object.entries(tokens.fonts)) {
      viewportSetup += `- **${name}:** \`${value}\`\n`;
    }
    viewportSetup += `\n`;
  }

  if (tokens.shadows.length > 0) {
    viewportSetup += `#### Shadow & Elevation System\n`;
    for (const shadow of tokens.shadows) {
      viewportSetup += `- \`${shadow}\`\n`;
    }
    viewportSetup += `\n`;
  }

  if (tokens.gradients.length > 0) {
    viewportSetup += `#### Gradient System\n`;
    for (const grad of tokens.gradients) {
      viewportSetup += `- \`${grad}\`\n`;
    }
    viewportSetup += `\n`;
  }

  // If Git analysis is present, append Git architecture
  if (gitData) {
    viewportSetup += `### Git Repository Architecture\n\n`;
    if (gitData.framework) viewportSetup += `- **Framework:** \`${gitData.framework}\`\n`;
    if (gitData.stylingSolution) viewportSetup += `- **Styling Solution:** \`${gitData.stylingSolution}\`\n`;
    if (gitData.dependencies && gitData.dependencies.length > 0) {
      viewportSetup += `- **Core Dependencies:** ${gitData.dependencies.slice(0, 15).map(d => `\`${d}\``).join(", ")}\n`;
    }
    if (fileTree && fileTree.length > 0) {
      viewportSetup += `\n#### Repository File Tree\n\`\`\`\n${renderFileTreeMarkdown(fileTree.slice(0, 20))}\`\`\`\n\n`;
    }
  }

  // 2. Component Layout & Deep Spatial Matrix
  let spatialMatrix = `## 2. Component Hierarchy & Deep Spatial Matrix (Exhaustive Element Tree)\n\n`;
  spatialMatrix += `Every container, navbar, button, badge, input, heading, card, and layout element extracted from the design:\n\n`;
  spatialMatrix += `| Element Hierarchy | Tag | Component Type | Coordinates (x/y/w/h) | Padding (T/R/B/L) | Margin (T/R/B/L) | Gap | Radius | Text Copy |\n`;
  spatialMatrix += `|---|---|---|---|---|---|---|---|---|\n`;
  spatialMatrix += renderSpatialMatrixRows(elements, 0);

  // 3. Micro-Effects, Typography, & Text Content
  let microEffects = `## 3. Micro-Effects, Typography & Exact Text Content Specifications\n\n`;
  for (const el of elements) {
    microEffects += renderElementEffects(el);
  }

  // 4. Responsive Transformation Rules
  let responsiveRules = `## 4. Responsive Transformation Rules (Desktop to Mobile Matrix)\n\n`;
  responsiveRules += `### General Viewport Scaling Directives\n`;
  responsiveRules += `- Artboard master containers collapse horizontally using Tailwind \`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8\`\n`;
  responsiveRules += `- Horizontal flex layouts on desktop (\`flex-row\`) collapse to vertical stacks on mobile (\`flex-col md:flex-row\`)\n`;
  responsiveRules += `- Elements marked with \`visibility: drawer\` or \`hidden\` collapse into an accessible mobile hamburger drawer\n`;
  responsiveRules += `- Gap and padding values scale down proportionally for mobile touch ergonomics (by 25-50%)\n\n`;
  responsiveRules += `### Component-Specific Breakpoint Adaptations\n`;
  responsiveRules += renderResponsiveRules(elements);

  // 5. IDE Code Generation Prompt
  let codeGeneration = `## 5. Ready-to-Run Code Implementation\n\n`;
  codeGeneration += buildCodeGenerationSteps(elements, tokens, projectName);

  const fullBlueprint = `# 🚀 Pixel-Accurate UI Implementation Blueprint & System Prompt

## Project: ${projectName}
> **Target Framework:** Next.js (App Router) • React 19 • Tailwind CSS • TypeScript • Lucide Icons
> **Design Source:** ${source.toUpperCase()}${sourceUrl ? ` (${sourceUrl})` : ""}
> **Total Extracted Elements:** ${elements.length} components & containers

---

## 🤖 AI Developer System Directives (MANDATORY INSTRUCTIONS)

You are an expert Principal Frontend Architect and Pixel-Precision UI Engineer. Your task is to generate complete, production-ready, beautiful React/Next.js code that **EXACTLY matches the design specifications** detailed in this document.

### Strict Execution Rules:
1. **PIXEL & LAYOUT FIDELITY:** You MUST build the UI exactly as specified below. Follow all exact pixel dimensions, coordinates, padding, margins, flex directions, alignments, gaps, and z-indexes.
2. **NO DUMMY / PLACEHOLDER TEXT:** Every heading, subtitle, button label, navigation link, badge, placeholder, and description MUST use the exact text strings provided in this blueprint. DO NOT replace them with "Lorem Ipsum" or generic filler.
3. **EXACT COLOR PALETTE & DESIGN TOKENS:** Use the exact hexadecimal and rgba color codes, background colors, borders, and box shadows provided.
4. **COMPLETE & PRODUCTION-READY CODE:** Do NOT provide abbreviated snippets, \`// ... rest of code ...\`, or omitted components. Provide 100% complete, fully styled React / Next.js TSX components with proper imports and Tailwind classes.
5. **RESPONSIVE & ADAPTIVE:** Ensure the implementation adheres to the Desktop-to-Mobile transformation rules (Section 4) using Tailwind responsive utility classes (\`sm:\`, \`md:\`, \`lg:\`).
6. **SEMANTIC & ACCESSIBLE HTML:** Use appropriate semantic HTML5 elements (\`<nav>\`, \`<header>\`, \`<main>\`, \`<section>\`, \`<article>\`, \`<aside>\`, \`<footer>\`, \`<button>\`, \`<input>\`, \`<a>\`, \`<h1>\`-\`<h6>\`, \`<p>\`) and include proper accessible attributes (e.g. \`aria-label\`, \`type="button"\`, \`type="text"\`).

---

${viewportSetup}

---

${spatialMatrix}

---

${microEffects}

---

${responsiveRules}

---

${codeGeneration}

---

## 📋 AI Self-Verification & Quality Checklist

Before finalizing your generated code, verify each item on this checklist:
- [ ] **Exact Copy Match:** Have all text strings, button labels, badges, and headings been copied verbatim from the specification?
- [ ] **Color Accuracy:** Are all background colors, gradients, borders, and text colors matching the token palette?
- [ ] **Spacing Proportions:** Are padding, margins, and flex/grid gaps matching the specified pixel dimensions?
- [ ] **Typography Scale:** Are font sizes, font weights, line heights, and letter spacings matching Section 3?
- [ ] **Interactions:** Are hover states, cursor styles, transition durations, and active states implemented?
- [ ] **Mobile Responsiveness:** Does the layout switch to mobile stack mode (\`flex-col\`) on screens \`< 768px\`?
- [ ] **No Placeholders:** Is all code fully written out without \`// TODO\` or missing components?
`;

  const chunks = chunkPrompt(fullBlueprint);

  return {
    fullBlueprint,
    chunks,
    viewportSetup,
    spatialMatrix,
    microEffects,
    responsiveRules,
    codeGenerationSteps: codeGeneration,
  };
}
