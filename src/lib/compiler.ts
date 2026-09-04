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

function formatMargin(m: [number, number, number, number]): string {
  return `${m[0]}px ${m[1]}px ${m[2]}px ${m[3]}px`;
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

    rows += `| ${namePrefix} | ${tag} | ${type} | ${pos} | ${pad} | ${mar} | ${gap} | ${radiusStr} |\n`;

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
    md += `${indent}  - Content: "${el.textContent.replace(/"/g, '\\"')}"\n`;
  }

  const d = el.layout.desktop_16_9;
  md += `${indent}  - Bounds: \`${d.coordinates.width}x${d.coordinates.height}px\` at \`(x: ${d.coordinates.x}, y: ${d.coordinates.y})\`\n`;

  if (s.backgroundColor && s.backgroundColor !== "transparent") {
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
    md += `${indent}  - Typography: \`${t.fontFamily}\` ${t.fontSizePx}px / line-height:${t.lineHeightPx}px weight:${t.fontWeight} color:\`${t.color}\`\n`;
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

function buildTailwindClasses(el: ElementSpatialNode): string {
  const classes: string[] = [];
  const d = el.layout.desktop_16_9;
  const s = el.styling;

  if (d.positionMode === "flex") classes.push("flex");
  else if (d.positionMode === "grid") classes.push("grid");
  else if (d.positionMode === "sticky") classes.push("sticky top-0 z-40");
  else if (d.positionMode === "absolute") classes.push("absolute");

  if (d.alignment.align === "center") classes.push("items-center");
  else if (d.alignment.align === "end") classes.push("items-end");
  else if (d.alignment.align === "stretch") classes.push("items-stretch");

  if (d.alignment.justify === "center") classes.push("justify-center");
  else if (d.alignment.justify === "end") classes.push("justify-end");
  else if (d.alignment.justify === "between") classes.push("justify-between");
  else if (d.alignment.justify === "around") classes.push("justify-around");

  const m = d.margin;
  if (m[0] > 0 && d.positionMode !== "absolute") classes.push(`mt-[${m[0]}px]`);
  if (m[1] > 0 && d.positionMode !== "absolute") classes.push(`mr-[${m[1]}px]`);
  if (m[2] > 0 && d.positionMode !== "absolute") classes.push(`mb-[${m[2]}px]`);
  if (m[3] > 0 && d.positionMode !== "absolute") classes.push(`ml-[${m[3]}px]`);

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
    if (r.topLeft > 0) classes.push(r.tailwindEquivalent || `rounded-[${r.topLeft}px]`);
  } else {
    if (r.topLeft) classes.push(`rounded-tl-[${r.topLeft}px]`);
    if (r.topRight) classes.push(`rounded-tr-[${r.topRight}px]`);
    if (r.bottomRight) classes.push(`rounded-br-[${r.bottomRight}px]`);
    if (r.bottomLeft) classes.push(`rounded-bl-[${r.bottomLeft}px]`);
  }

  if (s.backgroundColor && s.backgroundColor !== "transparent") {
    classes.push(`bg-[${s.backgroundColor}]`);
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
    nav: "nav",
    header: "header",
    main: "main",
    section: "section",
    article: "article",
    aside: "aside",
    footer: "footer",
    div: "div",
    button: "button",
    input: "input",
    a: "a",
  };
  return map[tag] || "div";
}

/**
 * Recursively generate JSX skeleton with real text contents and child elements
 */
function renderJsxElement(el: ElementSpatialNode, indentSpaces: number = 6): string {
  const indent = " ".repeat(indentSpaces);
  const tag = mapTag(el.semanticTag);
  const classes = buildTailwindClasses(el);
  const classAttr = classes ? ` className="${classes}"` : "";

  // If leaf element with text
  if (el.textContent && (!el.children || el.children.length === 0)) {
    if (tag === "input") {
      return `${indent}<input${classAttr} placeholder="${el.textContent.replace(/"/g, '&quot;')}" />\n`;
    }
    return `${indent}<${tag}${classAttr}>${el.textContent}</${tag}>\n`;
  }

  // If has children
  if (el.children && el.children.length > 0) {
    let out = `${indent}<${tag}${classAttr}>\n`;
    for (const child of el.children) {
      out += renderJsxElement(child, indentSpaces + 2);
    }
    out += `${indent}</${tag}>\n`;
    return out;
  }

  // Self closing or empty container
  return `${indent}<${tag}${classAttr}>{/* ${el.name} */}</${tag}>\n`;
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

  md += `### Step 2: Page Skeleton (Pixel-Faithful Hierarchy)\n\n`;
  md += "```tsx\n";
  md += "export default function Page() {\n";
  md += "  return (\n";
  md += '    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start">\n';

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
  md += `${headingPrefix} **${el.name}** (\`<${el.semanticTag}>\`)\n\n`;
  md += `${indent}  - **Coordinates:** \`x: ${d.coordinates.x}px\`, \`y: ${d.coordinates.y}px\` | **Dimensions:** \`${d.coordinates.width}px\` × \`${d.coordinates.height}px\`\n`;
  md += `${indent}  - **Layout:** Position mode \`${d.positionMode}\`, Justify \`${d.alignment.justify}\`, Align \`${d.alignment.align}\`\n`;
  md += `${indent}  - **Spacing:** Padding \`${formatMargin(d.padding)}\`, Margin \`${formatMargin(d.margin)}\`${d.gap ? `, Gap \`${d.gap}px\`` : ""}\n`;
  if (el.textContent) {
    md += `${indent}  - **Rendered Content:** "${el.textContent.replace(/"/g, '\\"')}"\n`;
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
  if (m) {
    md += `${indent}  - **Mobile:** Stack direction \`${m.stackDirection}\`, visibility \`${m.visibility}\`${m.gap ? `, mobile gap \`${m.gap}px\`` : ""}\n`;
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
  const { extraction, projectName } = doc;
  const elements = extraction.elements;
  const tokens = extraction.globalTokens;

  // 1. Viewport & Root Boundary Container Setup
  let viewportSetup = `## 1. Global Artboard Boundaries & Viewport Setup\n\n`;
  viewportSetup += `The design lives inside the following master boundary container:\n\n`;

  // First check if elements have root artboard containers
  if (elements.length > 0) {
    const primary = elements[0];
    const d = primary.layout.desktop_16_9;
    viewportSetup += `- **Master Artboard Canvas:** \`${d.coordinates.width}px\` × \`${d.coordinates.height}px\` (Aspect ratio ~${(d.coordinates.width / d.coordinates.height).toFixed(2)})\n`;
    viewportSetup += `- **Root Frame Name:** \`${primary.name}\` (\`<${primary.semanticTag}>\`)\n`;
    if (primary.styling.backgroundColor && primary.styling.backgroundColor !== "transparent") {
      viewportSetup += `- **Canvas Background Color:** \`${primary.styling.backgroundColor}\`\n`;
    }
    viewportSetup += `- **Outer Container Padding:** \`${formatMargin(d.padding)}\`\n`;
    viewportSetup += `- **Target Viewports:** Desktop base \`${d.coordinates.width}px\`, Mobile base \`${MOBILE_REFERENCE.width}px\`\n\n`;
  } else {
    viewportSetup += `- **Desktop Target (16:9):** Max width \`${DESKTOP_REFERENCE.width}px\`, base canvas \`${DESKTOP_REFERENCE.width}x${DESKTOP_REFERENCE.height}\`.\n`;
    viewportSetup += `- **Mobile Target (9:16):** Base width \`${MOBILE_REFERENCE.width}px\` to \`${MOBILE_REFERENCE.width + 40}px\`, vertical flow.\n\n`;
  }

  viewportSetup += `### Global Design Tokens\n\n`;
  if (Object.keys(tokens.colors).length > 0) {
    viewportSetup += `- **Palette Colors:**\n`;
    for (const [name, value] of Object.entries(tokens.colors)) {
      viewportSetup += `  - \`${name}\`: \`${value}\`\n`;
    }
  }
  if (Object.keys(tokens.fonts).length > 0) {
    viewportSetup += `- **Typography Fonts:**\n`;
    for (const [name, value] of Object.entries(tokens.fonts)) {
      viewportSetup += `  - Font \`${name}\`: \`${value}\`\n`;
    }
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

  // 2. Component Layout & Deep Spatial Matrix
  let spatialMatrix = `## 2. Component Layout & Deep Spatial Matrix (Exhaustive Element Tree)\n\n`;
  spatialMatrix += `Every element, button, navbar, heading, card, and layout container within the artboard border:\n\n`;
  spatialMatrix += `| Element Hierarchy | Tag | Type | Coordinates (x/y/w/h) | Padding (T/R/B/L) | Margin (T/R/B/L) | Gap | Radius |\n`;
  spatialMatrix += `|---|---|---|---|---|---|---|---|\n`;
  spatialMatrix += renderSpatialMatrixRows(elements, 0);

  // 3. Micro-Effects, Typography, & Text Content
  let microEffects = `## 3. Micro-Effects, Typography & Text Content Specifications\n\n`;
  for (const el of elements) {
    microEffects += renderElementEffects(el);
  }

  // 4. Responsive Transformation Rules
  let responsiveRules = `## 4. Responsive Transformation Rules (Desktop to Mobile)\n\n`;
  responsiveRules += `- Artboard containers collapse horizontally with \`w-full max-w-screen-xl px-4 sm:px-6 lg:px-8\`\n`;
  responsiveRules += `- Desktop flex rows collapse to vertical stacks on mobile (\`flex-col md:flex-row\`)\n`;
  responsiveRules += `- Elements with \`visibility: drawer\` or \`hidden\` collapse into an accessible mobile hamburger drawer\n`;
  responsiveRules += `- Gap and padding values scale down proportionally for touch ergonomics (by 25-50%)\n\n`;
  responsiveRules += renderResponsiveRules(elements);

  // 5. IDE Code Generation Prompt
  let codeGeneration = `## 5. IDE Code Generation Prompt (Pixel-Perfect Implementation)\n\n`;
  codeGeneration += buildCodeGenerationSteps(elements, tokens);

  const fullBlueprint = `# Pixel-Accurate UI Implementation Blueprint

## Project: ${projectName}

This specification contains the complete, pixel-accurate extraction of the design borders, container frames, navbars, buttons, typography, and interactive components. Feed this prompt directly into your IDE (Cursor, Claude, Copilot) to generate a pixel-faithful implementation.

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

## Execution Directives for the AI Developer

1. **Outer Boundary First:** Render the master canvas / artboard container with exact background color, padding, and constraints as specified in Section 1.
2. **Strict Component Hierarchy:** Construct every nested container, navbar, button, and typography node according to the spatial matrix in Section 2.
3. **Exact CSS/Tailwind Properties:** Every width, height, padding, margin, border-radius, font-family, and font-weight must match the exact pixel measurements in Section 3.
4. **Interactive Fidelity:** Buttons and navigation links must implement hover states, active transitions, and focus rings as defined in the interactions spec.
5. **Responsive Breakdown:** Apply the transformation rules in Section 4 to maintain visual balance across desktop and mobile viewports.
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
