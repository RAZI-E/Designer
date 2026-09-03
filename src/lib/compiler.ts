import type {
  ElementSpatialNode,
  DesignExtractionResult,
  PromptChunk,
  GeneratedPrompt,
  SpecDocument,
} from "@/lib/types/spatial";
import { DESKTOP_REFERENCE, MOBILE_REFERENCE } from "@/lib/gemini-spatial";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function px(n: number): string {
  return `${n}px`;
}

function formatMargin(m: [number, number, number, number]): string {
  return `${m[0]}px ${m[1]}px ${m[2]}px ${m[3]}px`;
}

function elementToRow(el: ElementSpatialNode): string {
  const d = el.layout.desktop_16_9;
  const m = d.margin;
  const p = d.padding;
  const r = el.styling.borderRadius;
  const radiusStr = r.tailwindEquivalent || `${r.topLeft}px`;
  return `| ${el.name} | \`<${el.semanticTag}>\` | x:${d.coordinates.x} y:${d.coordinates.y} w:${d.coordinates.width} h:${d.coordinates.height} | ${formatMargin(m)} | ${formatMargin(p)} | ${d.gap ? `${d.gap}px` : "-"} | ${radiusStr} |`;
}

function renderElementEffects(el: ElementSpatialNode, depth: number = 0): string {
  const indent = "  ".repeat(depth);
  const s = el.styling;
  const i = el.interactions;
  let md = "";

  md += `${indent}- **${el.name}** (\`<${el.semanticTag}>\`)\n`;

  if (s.backgroundColor && s.backgroundColor !== "transparent" && s.backgroundColor !== "#ffffff" && s.backgroundColor !== "#000000") {
    md += `${indent}  - Background: \`${s.backgroundColor}\`\n`;
  }

  if (s.border.width > 0 && s.border.style !== "none") {
    md += `${indent}  - Border: \`${s.border.width}px ${s.border.style} ${s.border.color}\`\n`;
  }

  const r = s.borderRadius;
  if (r.topLeft > 0 || r.topRight > 0 || r.bottomRight > 0 || r.bottomLeft > 0) {
    md += `${indent}  - Corner Radius: \`${r.topLeft}px\` (\`${r.tailwindEquivalent}\`)\n`;
  }

  if (s.effects.boxShadow) {
    md += `${indent}  - Box Shadow: \`${s.effects.boxShadow}\`\n`;
  }

  if (s.effects.glow) {
    md += `${indent}  - Glow: \`${s.effects.glow.tailwindClass}\`\n`;
  }

  if (s.effects.backdropBlur) {
    md += `${indent}  - Backdrop Blur: \`${s.effects.backdropBlur}\`\n`;
  }

  if (s.effects.opacity < 1) {
    md += `${indent}  - Opacity: \`${s.effects.opacity}\`\n`;
  }

  if (s.typography) {
    const t = s.typography;
    md += `${indent}  - Typography: \`${t.fontFamily}\` ${t.fontSizePx}px/${t.lineHeightPx}px weight:${t.fontWeight} color:\`${t.color}\`\n`;
    if (t.letterSpacing !== "normal" && t.letterSpacing !== "0em") {
      md += `${indent}  - Letter Spacing: \`${t.letterSpacing}\`\n`;
    }
    if (t.textTransform && t.textTransform !== "none") {
      md += `${indent}  - Text Transform: \`${t.textTransform}\`\n`;
    }
  }

  if (i.hoverEffect) {
    const h = i.hoverEffect;
    let hoverStr = `transition-all duration-${h.transitionDurationMs}ms`;
    if (h.transform) hoverStr += ` hover:${h.transform}`;
    if (h.backgroundColor) hoverStr += ` hover:bg-[${h.backgroundColor}]`;
    if (h.glow) hoverStr += ` ${h.glow}`;
    md += `${indent}  - Hover: \`${hoverStr}\`\n`;
  }

  if (i.activeClickEffect) {
    const a = i.activeClickEffect;
    let activeStr = "";
    if (a.transform) activeStr += `active:${a.transform}`;
    if (a.ring) activeStr += ` ${a.ring}`;
    md += `${indent}  - Active: \`${activeStr}\`\n`;
  }

  if (i.focusVisible) {
    md += `${indent}  - Focus: \`${i.focusVisible}\`\n`;
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
        md += `- **${el.name}**: Desktop \`flex-row\` -> Mobile \`${mDir === "col" ? "flex-col" : "flex-row"}\`\n`;
      }

      if (m.visibility !== "visible") {
        md += `- **${el.name}**: Hidden on mobile (\`${m.visibility}\`)\n`;
      }

      const dGap = d.gap || 0;
      const mGap = m.gap || 0;
      if (dGap !== mGap) {
        md += `- **${el.name}**: Gap \`${dGap}px\` -> \`${mGap}px\` on mobile\n`;
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

function buildCodeGenerationSteps(
  elements: ElementSpatialNode[],
  globalTokens: DesignExtractionResult["globalTokens"]
): string {
  let md = "";

  md += `### Step 1: Tailwind Config & Global Styles\n\n`;
  md += "```css\n";
  md += "/* globals.css - Custom properties from extracted tokens */\n";
  md += ":root {\n";
  for (const [name, value] of Object.entries(globalTokens.colors)) {
    md += `  --color-${name}: ${value};\n`;
  }
  md += "}\n\n";

  if (globalTokens.gradients.length > 0) {
    md += "/* Custom gradient utilities */\n";
    for (const grad of globalTokens.gradients) {
      md += `/* ${grad} */\n`;
    }
  }
  md += "```\n\n";

  md += `### Step 2: Layout Skeleton\n\n`;
  md += "```tsx\n";
  md += "export default function Page() {\n";
  md += "  return (\n";
  md += '    <div className="min-h-screen bg-background text-foreground">\n';

  for (const el of elements) {
    const d = el.layout.desktop_16_9;
    const classes = buildTailwindClasses(el);
    md += `      <${mapTag(el.semanticTag)} className="${classes}">\n`;
    if (el.children && el.children.length > 0) {
      for (const child of el.children) {
        const childClasses = buildTailwindClasses(child);
        md += `        <${mapTag(child.semanticTag)} className="${childClasses}">\n`;
        md += `          {/* ${child.name} content */}\n`;
        md += `        </${mapTag(child.semanticTag)}>\n`;
      }
    }
    md += `      </${mapTag(el.semanticTag)}>\n`;
  }

  md += "    </div>\n";
  md += "  );\n";
  md += "}\n";
  md += "```\n\n";

  md += `### Step 3: Component Details with Exact Spacing\n\n`;
  for (const el of elements) {
    md += renderComponentCode(el);
  }

  return md;
}

function buildTailwindClasses(el: ElementSpatialNode): string {
  const classes: string[] = [];
  const d = el.layout.desktop_16_9;
  const s = el.styling;

  if (d.positionMode === "flex") classes.push("flex");
  if (d.positionMode === "grid") classes.push("grid");
  if (d.positionMode === "sticky") classes.push("sticky top-0");
  if (d.positionMode === "absolute") classes.push("absolute");

  if (d.alignment.align === "center") classes.push("items-center");
  else if (d.alignment.align === "end") classes.push("items-end");
  else if (d.alignment.align === "stretch") classes.push("items-stretch");

  if (d.alignment.justify === "center") classes.push("justify-center");
  else if (d.alignment.justify === "end") classes.push("justify-end");
  else if (d.alignment.justify === "between") classes.push("justify-between");
  else if (d.alignment.justify === "around") classes.push("justify-around");

  const m = d.margin;
  if (m[0] > 0) classes.push(`mt-[${m[0]}px]`);
  if (m[1] > 0) classes.push(`mr-[${m[1]}px]`);
  if (m[2] > 0) classes.push(`mb-[${m[2]}px]`);
  if (m[3] > 0) classes.push(`ml-[${m[3]}px]`);

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

  if (d.gap && d.gap > 0) classes.push(`gap-[${d.gap}px]`);

  const r = s.borderRadius;
  if (r.topLeft === r.topRight && r.topRight === r.bottomRight && r.bottomRight === r.bottomLeft) {
    if (r.topLeft > 0) classes.push(r.tailwindEquivalent);
  } else {
    if (r.topLeft) classes.push(`rounded-tl-[${r.topLeft}px]`);
    if (r.topRight) classes.push(`rounded-tr-[${r.topRight}px]`);
    if (r.bottomRight) classes.push(`rounded-br-[${r.bottomRight}px]`);
    if (r.bottomLeft) classes.push(`rounded-bl-[${r.bottomLeft}px]`);
  }

  if (s.border.width > 0 && s.border.style !== "none") {
    classes.push(`border border-[${s.border.color}]`);
  }

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

  if (s.typography) {
    const t = s.typography;
    const sizeMap: Record<number, string> = {
      12: "text-xs", 14: "text-sm", 16: "text-base", 18: "text-lg",
      20: "text-xl", 24: "text-2xl", 30: "text-3xl", 36: "text-4xl",
    };
    classes.push(sizeMap[t.fontSizePx] || `text-[${t.fontSizePx}px]`);

    const weightMap: Record<number, string> = {
      300: "font-light", 400: "font-normal", 500: "font-medium",
      600: "font-semibold", 700: "font-bold", 800: "font-extrabold",
    };
    classes.push(weightMap[t.fontWeight] || `font-[${t.fontWeight}]`);
  }

  const i = el.interactions;
  if (i.hoverEffect) {
    if (i.hoverEffect.cursor === "pointer") classes.push("cursor-pointer");
    if (i.hoverEffect.transform) classes.push(`hover:${i.hoverEffect.transform}`);
    if (i.hoverEffect.backgroundColor) classes.push(`hover:bg-[${i.hoverEffect.backgroundColor}]`);
    if (i.hoverEffect.glow) classes.push(i.hoverEffect.glow);
    classes.push(`transition-all duration-[${i.hoverEffect.transitionDurationMs}ms]`);
  }

  if (i.activeClickEffect) {
    if (i.activeClickEffect.transform) classes.push(`active:${i.activeClickEffect.transform}`);
    if (i.activeClickEffect.ring) classes.push(i.activeClickEffect.ring);
  }

  return classes.join(" ");
}

function mapTag(tag: ElementSpatialNode["semanticTag"]): string {
  const map: Record<string, string> = {
    nav: "nav", header: "header", main: "main", section: "section",
    article: "article", aside: "aside", footer: "footer",
    div: "div", button: "button", input: "input", a: "a",
  };
  return map[tag] || "div";
}

function renderComponentCode(el: ElementSpatialNode): string {
  const d = el.layout.desktop_16_9;
  const m = el.layout.mobile_9_16;
  let md = "";

  md += `**${el.name}** (\`<${el.semanticTag}>\`)\n\n`;
  md += `- Desktop: x=${d.coordinates.x} y=${d.coordinates.y} w=${d.coordinates.width} h=${d.coordinates.height}\n`;
  md += `- Viewport: ${d.viewportPercentage.width} x ${d.viewportPercentage.height} at (${d.viewportPercentage.left}, ${d.viewportPercentage.top})\n`;
  md += `- Margin: ${formatMargin(d.margin)}\n`;
  md += `- Padding: ${formatMargin(d.padding)}\n`;
  if (d.gap) md += `- Gap: ${d.gap}px\n`;
  if (m) {
    md += `- Mobile: stack=${m.stackDirection}, visibility=${m.visibility}\n`;
  }
  md += "\n";

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
  const { extraction, projectName } = doc;
  const elements = extraction.elements;
  const tokens = extraction.globalTokens;

  let viewportSetup = `## 1. Global Viewport & Container Setup\n\n`;
  viewportSetup += `- **Desktop Target (16:9):** Max width \`${DESKTOP_REFERENCE.width}px\`, base design tested at \`${DESKTOP_REFERENCE.width}x${DESKTOP_REFERENCE.height}\`.\n`;
  viewportSetup += `- **Mobile Target (9:16):** Base width \`${MOBILE_REFERENCE.width}px\` to \`${MOBILE_REFERENCE.width + 40}px\`, vertical flow.\n`;
  viewportSetup += `- **Global Theme Tokens:**\n`;
  for (const [name, value] of Object.entries(tokens.colors)) {
    viewportSetup += `  - \`${name}\`: \`${value}\`\n`;
  }
  for (const [name, value] of Object.entries(tokens.fonts)) {
    viewportSetup += `  - Font \`${name}\`: \`${value}\`\n`;
  }
  if (tokens.shadows.length > 0) {
    viewportSetup += `- **Shadow System:**\n`;
    for (const shadow of tokens.shadows) {
      viewportSetup += `  - \`${shadow}\`\n`;
    }
  }
  if (tokens.gradients.length > 0) {
    viewportSetup += `- **Gradient System:**\n`;
    for (const grad of tokens.gradients) {
      viewportSetup += `  - \`${grad}\`\n`;
    }
  }

  let spatialMatrix = `## 2. Component Layout & Spatial Matrix (Absolute Distances)\n\n`;
  spatialMatrix += `| Element | Tag | Desktop Pos (16:9) | Padding (px) | Margin (px) | Gap (px) | Radius |\n`;
  spatialMatrix += `|---|---|---|---|---|---|---|\n`;
  for (const el of elements) {
    spatialMatrix += elementToRow(el) + "\n";
  }

  let microEffects = `## 3. Micro-Effects & Shader/Glow Specifications\n\n`;
  for (const el of elements) {
    microEffects += renderElementEffects(el);
  }

  let responsiveRules = `## 4. Responsive Transformation Rules (16:9 to 9:16)\n\n`;
  responsiveRules += `- Desktop flex rows collapse to vertical stacks on mobile\n`;
  responsiveRules += `- Elements with \`visibility: drawer\` become slide-out panels on mobile\n`;
  responsiveRules += `- Gap values typically reduce by 50-75% on mobile\n\n`;
  responsiveRules += renderResponsiveRules(elements);

  let codeGeneration = `## 5. IDE Code Generation Prompt (Chunked Execution)\n\n`;
  codeGeneration += buildCodeGenerationSteps(elements, tokens);

  const fullBlueprint = `# Pixel-Accurate UI Implementation Blueprint

## Project: ${projectName}

This document contains an exhaustive, mathematically grounded Design Execution Specification extracted from the source design. Use this as the single source of truth for implementing a pixel-faithful replica.

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

## Implementation Notes

1. **Start with the viewport container.** Create a max-width wrapper at 1920px centered on the page.
2. **Build the layout skeleton first.** Use the spatial matrix to position all top-level elements.
3. **Apply styling layer by layer.** Backgrounds first, then borders, then shadows, then typography.
4. **Add micro-interactions last.** Hover effects, active states, focus rings.
5. **Test responsive at 390px and 1920px breakpoints.** Use the mobile_9_16 specs for the small screen.
6. **Verify all measurements.** Every pixel value in this document was calculated from the original design proportions.
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
