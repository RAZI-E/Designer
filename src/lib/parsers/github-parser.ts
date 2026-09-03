import { Octokit } from "@octokit/rest";
import type { FileTreeNode } from "@/lib/types/spec-dsl";

interface RepoAnalysis {
  fileTree: FileTreeNode[];
  packageJson?: Record<string, unknown>;
  tailwindConfig?: string;
  componentSignatures: ComponentSignature[];
  dependencies: string[];
  devDependencies: string[];
  framework: string;
  stylingSolution: string;
}

interface ComponentSignature {
  name: string;
  path: string;
  exports: string[];
  props: string[];
  isDefault: boolean;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  return null;
}

async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in data && typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchFileTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string = "HEAD"
): Promise<FileTreeNode[]> {
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "true",
  });

  const rootNodes: FileTreeNode[] = [];
  const pathMap = new Map<string, FileTreeNode>();

  for (const item of tree.tree) {
    const parts = item.path?.split("/") || [];
    const name = parts[parts.length - 1] || "";
    const isDirectory = item.type === "tree";

    const node: FileTreeNode = {
      name,
      path: item.path || "",
      type: isDirectory ? "directory" : "file",
      children: isDirectory ? [] : undefined,
      language: getFileLanguage(name),
    };

    pathMap.set(item.path || "", node);

    if (parts.length === 1) {
      rootNodes.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  return rootNodes;
}

function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    md: "markdown",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    swift: "swift",
    kt: "kotlin",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext || ""] || "text";
}

function detectFramework(
  packageJson: Record<string, unknown> | undefined,
  fileTree: FileTreeNode[]
): { framework: string; stylingSolution: string } {
  let framework = "unknown";
  let stylingSolution = "unknown";

  if (packageJson) {
    const deps = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {}),
    };

    if (deps.next) framework = "Next.js";
    else if (deps.nuxt) framework = "Nuxt.js";
    else if (deps["@angular/core"]) framework = "Angular";
    else if (deps.vue) framework = "Vue.js";
    else if (deps.svelte) framework = "Svelte";
    else if (deps.react) framework = "React";
    else if (deps.vue) framework = "Vue";

    if (deps["tailwindcss"]) stylingSolution = "Tailwind CSS";
    else if (deps["@emotion/react"]) stylingSolution = "Emotion";
    else if (deps.styled) stylingSolution = "Styled Components";
    else if (deps["@mui/material"]) stylingSolution = "Material UI";
    else if (deps["sass"]) stylingSolution = "Sass/SCSS";
  }

  const hasTailwindConfig = fileTree.some((node) =>
    node.name === "tailwind.config.js" ||
    node.name === "tailwind.config.ts" ||
    node.name === "tailwind.config.mjs"
  );

  if (hasTailwindConfig) stylingSolution = "Tailwind CSS";

  return { framework, stylingSolution };
}

function extractComponentSignatures(content: string, path: string): ComponentSignature[] {
  const signatures: ComponentSignature[] = [];

  const componentRegex = /(?:export\s+(?:default\s+)?)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)\s*(?:<[^>]*>)?\s*(?:\([^)]*\)|:\s*React\.FC)/g;

  let match;
  while ((match = componentRegex.exec(content)) !== null) {
    const name = match[1];
    const isDefault = match[0].includes("export default");

    const propsRegex = /(?:interface|type)\s+(\w+Props)\s*=\s*\{([^}]+)\}/g;
    const props: string[] = [];

    let propsMatch;
    while ((propsMatch = propsRegex.exec(content)) !== null) {
      const propsContent = propsMatch[2];
      const propLines = propsContent.split("\n").filter((line) => line.trim());
      for (const line of propLines) {
        const propName = line.split(":")[0]?.trim();
        if (propName && !propName.startsWith("//")) {
          props.push(propName);
        }
      }
    }

    signatures.push({
      name,
      path,
      exports: isDefault ? ["default"] : [name],
      props,
      isDefault,
    });
  }

  return signatures;
}

export async function analyzeGitHubRepo(
  repoUrl: string,
  token?: string
): Promise<RepoAnalysis> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  const { owner, repo } = parsed;

  const octokit = new Octokit({
    auth: token || process.env.GITHUB_TOKEN,
  });

  const fileTree = await fetchFileTree(octokit, owner, repo);

  const packageJsonContent = await fetchFileContent(octokit, owner, repo, "package.json");
  let packageJson: Record<string, unknown> | undefined;
  if (packageJsonContent) {
    try {
      packageJson = JSON.parse(packageJsonContent);
    } catch {
      packageJson = undefined;
    }
  }

  const tailwindConfig = await fetchFileContent(octokit, owner, repo, "tailwind.config.js")
    || await fetchFileContent(octokit, owner, repo, "tailwind.config.ts");

  const deps = packageJson
    ? Object.keys(packageJson.dependencies as Record<string, string> || {})
    : [];
  const devDeps = packageJson
    ? Object.keys(packageJson.devDependencies as Record<string, string> || {})
    : [];

  const { framework, stylingSolution } = detectFramework(packageJson, fileTree);

  const componentSignatures: ComponentSignature[] = [];
  const componentPaths = findComponentFiles(fileTree);

  for (const componentPath of componentPaths.slice(0, 50)) {
    const content = await fetchFileContent(octokit, owner, repo, componentPath);
    if (content) {
      const signatures = extractComponentSignatures(content, componentPath);
      componentSignatures.push(...signatures);
    }
  }

  return {
    fileTree,
    packageJson,
    tailwindConfig: tailwindConfig || undefined,
    componentSignatures,
    dependencies: deps,
    devDependencies: devDeps,
    framework,
    stylingSolution,
  };
}

function findComponentFiles(tree: FileTreeNode[]): string[] {
  const componentFiles: string[] = [];

  function traverse(node: FileTreeNode) {
    if (node.type === "file") {
      const isComponent =
        (node.language === "typescript" || node.language === "javascript") &&
        (node.name.match(/^[A-Z]/) ||
          node.path.includes("/components/") ||
          node.path.includes("/ui/"));

      if (isComponent) {
        componentFiles.push(node.path);
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of tree) {
    traverse(node);
  }

  return componentFiles;
}
