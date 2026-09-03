import { NextRequest, NextResponse } from "next/server";
import { analyzeGitHubRepo } from "@/lib/parsers/github-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, token } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "GitHub repository URL is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeGitHubRepo(repoUrl, token);

    return NextResponse.json({
      fileTree: analysis.fileTree,
      packageJson: analysis.packageJson,
      tailwindConfig: analysis.tailwindConfig,
      componentSignatures: analysis.componentSignatures,
      dependencies: analysis.dependencies,
      devDependencies: analysis.devDependencies,
      framework: analysis.framework,
      stylingSolution: analysis.stylingSolution,
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalComponents: analysis.componentSignatures.length,
        totalFiles: countFiles(analysis.fileTree),
      },
    });
  } catch (error) {
    console.error("GitHub analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze repository" },
      { status: 500 }
    );
  }
}

function countFiles(tree: Array<{ type: string; children?: Array<{ type: string }> }>): number {
  let count = 0;
  for (const node of tree) {
    if (node.type === "file") count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}
