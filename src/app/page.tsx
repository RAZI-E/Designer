import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GitBranch,
  PenTool,
  FileImage,
  Sparkles,
  ArrowRight,
  Layers,
  Palette,
  Code2,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <Image
              src="/logo.png"
              alt="Designer Logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain shadow-sm"
              priority
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight">Designer</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">by Lavaithan</span>
            </div>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link href="https://github.com/lavaithan/designer" target="_blank">
              <Button variant="outline" size="sm">
                GitHub
              </Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-4">
            Open Source & Free
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Convert Designs into
            <br />
            <span className="text-primary">IDE-Ready Prompts</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Transform Git repositories, Figma files, and PSDs into structured,
            token-efficient prompts with exact component placements, spatial
            distances, and design tokens.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://github.com/lavaithan/designer" target="_blank">
              <Button size="lg" variant="outline">
                View Source
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Three Input Sources, One Output
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <GitBranch className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Git Repository</CardTitle>
                <CardDescription>
                  Analyze existing codebases to extract component signatures,
                  file structures, and styling patterns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Component detection & props extraction</li>
                  <li>Tailwind config analysis</li>
                  <li>File tree mapping</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PenTool className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Figma Design</CardTitle>
                <CardDescription>
                  Import Figma files to extract precise layout trees, AutoLayout
                  parameters, and design tokens.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>AutoLayout gap & padding extraction</li>
                  <li>Color palette & typography mapping</li>
                  <li>Bounding box calculations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileImage className="h-10 w-10 text-primary mb-2" />
                <CardTitle>PSD / Image</CardTitle>
                <CardDescription>
                  Upload PSD files or design screenshots for AI-powered spatial
                  analysis and component detection.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Layer tree parsing</li>
                  <li>Gemini 2.5 Flash vision analysis</li>
                  <li>Component categorization</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Ingest</h3>
              <p className="text-sm text-muted-foreground">
                Upload your design source (Git, Figma, or PSD)
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. Analyze</h3>
              <p className="text-sm text-muted-foreground">
                AI extracts components, spacing, and design tokens
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Generate</h3>
              <p className="text-sm text-muted-foreground">
                Structured Spec DSL with Tailwind-mapped tokens
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">4. Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Copy prompt, export markdown, or download .cursorrules
              </p>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="container mx-auto px-4 py-20 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Start converting your designs into pixel-perfect IDE prompts
              today. No sign-up required, completely free and open source.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="gap-2">
                Launch Designer <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Designer by Lavaithan is open source under the MIT License. Built with Next.js,
            Tailwind CSS, and Gemini 2.5 Flash.
          </p>
        </div>
      </footer>
    </div>
  );
}
