import type { SpecDocument, SpecComponent, DesignTokens, PromptChunk, GeneratedPrompt, FileTreeNode } from "@/lib/types/spec-dsl";
import { estimateTokens } from "@/lib/utils";

function generateDesignTokensMarkdown(tokens: DesignTokens): string {
  return `## Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | \`${tokens.colors.primary}\` | Primary actions, links, focus states |
| Secondary | \`${tokens.colors.secondary}\` | Secondary buttons, subtle accents |
| Accent | \`${tokens.colors.accent}\` | Highlights, badges, special elements |
| Background | \`${tokens.colors.background}\` | Page background |
| Foreground | \`${tokens.colors.foreground}\` | Primary text color |
| Muted | \`${tokens.colors.muted}\` | Disabled text, placeholders |
| Border | \`${tokens.colors.border}\` | Card borders, dividers |
| Destructive | \`${tokens.colors.destructive}\` | Error states, delete actions |

### Typography
\`\`\`css
font-family: ${tokens.typography.fontFamily};

/* Font Sizes */
--text-sm: ${tokens.typography.sizes.sm}px;
--text-base: ${tokens.typography.sizes.base}px;
--text-lg: ${tokens.typography.sizes.lg}px;
--text-xl: ${tokens.typography.sizes.xl}px;
--text-2xl: ${tokens.typography.sizes["2xl"]}px;
--text-3xl: ${tokens.typography.sizes["3xl"]}px;

/* Font Weights */
--font-normal: ${tokens.typography.weights.normal};
--font-medium: ${tokens.typography.weights.medium};
--font-semibold: ${tokens.typography.weights.semibold};
--font-bold: ${tokens.typography.weights.bold};
\`\`\`

### Spacing Scale (Tailwind CSS)
\`\`\`css
--space-0: 0px;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
\`\`\`

### Border Radius
\`\`\`css
--radius-none: 0px;
--radius-sm: 2px;
--radius-default: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
\`\`\`
`;
}

function generateComponentGuide(component: SpecComponent, depth: number = 0): string {
  const indent = "  ".repeat(depth);
  const spacing = component.spatialDistances;
  const layout = component.layout;

  let md = `${indent}### ${component.componentName || component.name}

**Category:** ${component.category}
**Dimensions:** ${component.boundingBox.width}x${component.boundingBox.height}px
**Position:** x=${component.boundingBox.x}, y=${component.boundingBox.y}

`;

  if (layout.type === "flex" || layout.type === "grid") {
    md += `**Layout:**
- Type: \`${layout.type}\`
- Direction: \`${layout.direction || "column"}\`
- Gap: \`${layout.gap ? `gap-${layout.gap / 4}` : "gap-0"}\`
- Padding: \`${formatPadding(layout.padding)}\`
${layout.align ? `- Align: \`${layout.align}\`\n` : ""}${layout.justify ? `- Justify: \`${layout.justify}\`\n` : ""}
`;
  }

  if (spacing.marginTop > 0 || spacing.marginRight > 0 || spacing.marginBottom > 0 || spacing.marginLeft > 0) {
    md += `**Margins:**
- Top: \`${spacing.marginTop}px\` (${closestTailwindClass(spacing.marginTop, "margin")})
- Right: \`${spacing.marginRight}px\`
- Bottom: \`${spacing.marginBottom}px\`
- Left: \`${spacing.marginLeft}px\`

`;
  }

  if (Object.keys(component.styles.colors).length > 0) {
    md += `**Colors:**
`;
    for (const [key, value] of Object.entries(component.styles.colors)) {
      md += `- ${key}: \`${value}\`\n`;
    }
    md += "\n";
  }

  if (component.styles.fontSize) {
    md += `**Typography:**
- Font Size: \`${component.styles.fontSize}px\`
- Font Weight: \`${component.styles.fontWeight || 400}\`
- Line Height: \`${component.styles.lineHeight || 1.5}\`

`;
  }

  if (component.textContent) {
    md += `**Text Content:** "${component.textContent}"

`;
  }

  md += `**Tailwind Classes:**
\`\`\`tsx
<div className="${generateTailwindClasses(component)}">
  {/* ... */}
</div>
\`\`\`

`;

  if (component.children.length > 0) {
    md += `**Children (${component.children.length}):**

`;
    for (const child of component.children) {
      md += generateComponentGuide(child, depth + 1);
    }
  }

  return md;
}

function formatPadding(padding: { top: number; right: number; bottom: number; left: number }): string {
  const parts = [];
  if (padding.top > 0) parts.push(`pt-${padding.top / 4}`);
  if (padding.right > 0) parts.push(`pr-${padding.right / 4}`);
  if (padding.bottom > 0) parts.push(`pb-${padding.bottom / 4}`);
  if (padding.left > 0) parts.push(`pl-${padding.left / 4}`);
  return parts.join(" ") || "p-0";
}

function closestTailwindClass(px: number, type: "margin" | "padding" | "gap"): string {
  const prefix = type === "margin" ? "m" : type === "padding" ? "p" : "gap";
  const value = Math.round(px / 4);
  return `${prefix}-${value}`;
}

function generateTailwindClasses(component: SpecComponent): string {
  const classes: string[] = [];

  if (component.layout.type === "flex") {
    classes.push("flex");
    if (component.layout.direction === "row") classes.push("flex-row");
    if (component.layout.direction === "column") classes.push("flex-col");
    if (component.layout.gap) classes.push(`gap-${component.layout.gap / 4}`);
    if (component.layout.align) {
      const alignMap: Record<string, string> = {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
      };
      classes.push(alignMap[component.layout.align] || "items-start");
    }
    if (component.layout.justify) {
      const justifyMap: Record<string, string> = {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
      };
      classes.push(justifyMap[component.layout.justify] || "justify-start");
    }
  }

  const padding = component.layout.padding;
  if (padding.top || padding.right || padding.bottom || padding.left) {
    if (padding.top === padding.right && padding.right === padding.bottom && padding.bottom === padding.left) {
      classes.push(`p-${padding.top / 4}`);
    } else {
      if (padding.top) classes.push(`pt-${padding.top / 4}`);
      if (padding.right) classes.push(`pr-${padding.right / 4}`);
      if (padding.bottom) classes.push(`pb-${padding.bottom / 4}`);
      if (padding.left) classes.push(`pl-${padding.left / 4}`);
    }
  }

  if (component.styles.fontSize) {
    const sizeMap: Record<number, string> = {
      12: "text-xs",
      14: "text-sm",
      16: "text-base",
      18: "text-lg",
      20: "text-xl",
      24: "text-2xl",
      30: "text-3xl",
    };
    classes.push(sizeMap[component.styles.fontSize] || "text-base");
  }

  if (component.styles.fontWeight) {
    const weightMap: Record<number, string> = {
      400: "font-normal",
      500: "font-medium",
      600: "font-semibold",
      700: "font-bold",
    };
    classes.push(weightMap[component.styles.fontWeight] || "font-normal");
  }

  if (component.styles.radius) {
    classes.push(`rounded-${component.styles.radius}`);
  }

  return classes.join(" ");
}

function generateFileTreeMarkdown(fileTree: FileTreeNode[], indent: number = 0): string {
  let md = "";
  const prefix = "  ".repeat(indent);

  for (const node of fileTree) {
    if (node.type === "directory") {
      md += `${prefix}📁 ${node.name}/\n`;
      if (node.children) {
        md += generateFileTreeMarkdown(node.children, indent + 1);
      }
    } else {
      md += `${prefix}📄 ${node.name}\n`;
    }
  }

  return md;
}

function generateSystemPrompt(doc: SpecDocument): string {
  return `You are an expert Full-Stack Engineer and Systems Architect specializing in building modern web applications with Next.js, React, Tailwind CSS, and Shadcn UI.

## Project: ${doc.projectName}

## Context
You are working on a project called "${doc.projectName}". The design has been analyzed and converted into a structured specification. Your task is to implement the components exactly as specified, following the design tokens and layout rules provided.

## Key Principles
1. **Pixel-Perfect Implementation**: Match the exact spacing, colors, and typography from the spec
2. **Component Composition**: Build reusable, composable components following React best practices
3. **Responsive Design**: Ensure components work across all screen sizes
4. **Accessibility**: Include proper ARIA labels, semantic HTML, and keyboard navigation
5. **Type Safety**: Use TypeScript for all props and component definitions

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS v4
- **Components**: Shadcn UI
- **Language**: TypeScript

## File Structure Convention
\`\`\`
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/          # Shadcn UI components
│   └── [feature]/   # Feature-specific components
├── lib/
│   ├── utils.ts     # Utility functions
│   └── types/       # TypeScript type definitions
└── styles/
    └── globals.css  # Global styles and CSS variables
\`\`\`

## Design Tokens
${generateDesignTokensMarkdown(doc.designTokens)}

## Component Specifications
${doc.components.map((c) => generateComponentGuide(c)).join("\n---\n\n")}

## Implementation Order
1. Set up the project structure and install dependencies
2. Configure Tailwind CSS with the design tokens
3. Create the base UI components (buttons, inputs, cards)
4. Implement the layout components (navbar, footer, sidebar)
5. Build the page-specific components
6. Add responsive behavior and animations
7. Test and refine the implementation
`;
}

function chunkPrompt(systemPrompt: string, maxTokens: number = 4000): PromptChunk[] {
  const chunks: PromptChunk[] = [];
  const sections = systemPrompt.split(/\n(?=## )/);

  let currentChunk = "";
  let currentTokens = 0;

  for (const section of sections) {
    const sectionTokens = estimateTokens(section);

    if (currentTokens + sectionTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        title: `Section ${chunks.length + 1}`,
        content: currentChunk.trim(),
        tokenEstimate: currentTokens,
      });
      currentChunk = "";
      currentTokens = 0;
    }

    currentChunk += section + "\n";
    currentTokens += sectionTokens;
  }

  if (currentChunk.trim()) {
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      title: `Section ${chunks.length + 1}`,
      content: currentChunk.trim(),
      tokenEstimate: currentTokens,
    });
  }

  return chunks;
}

function generateCursorRules(doc: SpecDocument): string {
  return `# ${doc.projectName} - Cursor Rules

## Project Context
This is a Next.js application with Tailwind CSS and Shadcn UI.

## Design Tokens
- Primary: ${doc.designTokens.colors.primary}
- Secondary: ${doc.designTokens.colors.secondary}
- Accent: ${doc.designTokens.colors.accent}
- Background: ${doc.designTokens.colors.background}
- Foreground: ${doc.designTokens.colors.foreground}

## Component Conventions
- Use Shadcn UI components as the base
- Follow the exact spacing and color tokens from the spec
- Use TypeScript for all component props
- Export components as named exports

## File Naming
- Components: PascalCase (e.g., \`UserProfile.tsx\`)
- Utilities: camelCase (e.g., \`formatDate.ts\`)
- Types: PascalCase with \`Types\` suffix (e.g., \`UserTypes.ts\`)

## Code Style
- Use functional components with hooks
- Prefer composition over configuration
- Keep components small and focused
- Extract reusable logic into custom hooks

## CSS/Tailwind Conventions
- Use the design tokens from the spec
- Prefer Tailwind utility classes over custom CSS
- Use CSS variables for dynamic values
- Follow the spacing scale (4px base)
`;
}

export function generatePrompt(doc: SpecDocument): GeneratedPrompt {
  const systemPrompt = generateSystemPrompt(doc);
  const chunks = chunkPrompt(systemPrompt);
  const cursorRules = generateCursorRules(doc);
  const designTokensMarkdown = generateDesignTokensMarkdown(doc.designTokens);

  const componentGuide = doc.components
    .map((c) => generateComponentGuide(c))
    .join("\n---\n\n");

  const fileTreeMarkdown = doc.fileTree
    ? generateFileTreeMarkdown(doc.fileTree)
    : "No file tree available.";

  const fullMarkdown = `# ${doc.projectName} - Implementation Guide

${systemPrompt}

---

## Component Guide

${componentGuide}

---

## File Structure

\`\`\`
${fileTreeMarkdown}
\`\`\`

---

## Design Tokens

${designTokensMarkdown}

---

## Cursor Rules

\`\`\`markdown
${cursorRules}
\`\`\`
`;

  return {
    systemPrompt,
    chunks,
    fullMarkdown,
    cursorRules,
    designTokensMarkdown,
    componentGuide,
    fileTreeMarkdown,
  };
}
