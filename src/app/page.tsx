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
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-90 transition-opacity min-w-0">
            <Image
              src="/logo.png"
              alt="Designer Logo"
              width={32}
              height={32}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-contain shadow-sm shrink-0"
              priority
            />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-lg sm:text-xl font-bold tracking-tight">Designer</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">by Lavaithan</span>
            </div>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="px-2.5 sm:px-3 text-xs sm:text-sm h-8">
                Dashboard
              </Button>
            </Link>
            <Link href="https://github.com/RAZI-E/Designer" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="px-2.5 sm:px-3 text-xs sm:text-sm h-8">
                GitHub
              </Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
          <Badge variant="secondary" className="mb-4 inline-flex text-center max-w-full text-xs font-medium py-1 px-3">
            AI Design to Prompt • Open Source & Free
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
            Convert Design in
            <br />
            <span className="text-primary">Pixel-Accurate Prompts for IDEs</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2 leading-relaxed">
            <strong>Designer by Lavaithan</strong> transforms Figma designs, UI mockups, and screenshots
            into structured, token-efficient IDE prompts with exact component placements, spatial borders,
            and Tailwind design tokens.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-sm sm:text-base h-11">
                Convert Design to Prompt <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://github.com/RAZI-E/Designer" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm sm:text-base h-11">
                View Source
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            Three Input Sources, One Output
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <Card>
              <CardHeader>
                <GitBranch className="h-9 w-9 sm:h-10 sm:w-10 text-primary mb-2" />
                <CardTitle>Git Repository</CardTitle>
                <CardDescription>
                  Analyze existing codebases to extract component signatures,
                  file structures, and styling patterns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>Component detection & props extraction</li>
                  <li>Tailwind config analysis</li>
                  <li>File tree mapping</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PenTool className="h-9 w-9 sm:h-10 sm:w-10 text-primary mb-2" />
                <CardTitle>Convert Figma Design into Prompts</CardTitle>
                <CardDescription>
                  Connect your Figma workspace to extract root canvas borders, AutoLayout flex parameters,
                  nested component trees, and typography into structured IDE prompts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>Root artboard border & padding detection</li>
                  <li>AutoLayout gap, flex direction & padding extraction</li>
                  <li>Interactive button, navbar, & text content mapping</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileImage className="h-9 w-9 sm:h-10 sm:w-10 text-primary mb-2" />
                <CardTitle>AI Design to Prompt (Vision)</CardTitle>
                <CardDescription>
                  Upload UI screenshots or design mockups for multimodal AI spatial analysis
                  and mathematical component detection powered by Gemini 3.5 Flash.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>High-resolution screenshot analysis</li>
                  <li>Gemini 3.5 Flash vision spatial extraction</li>
                  <li>Pixel-accurate coordinates & Tailwind mapping</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Ingest</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Upload your design source (Git, Figma, or Image)
              </p>
            </div>
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. Analyze</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                AI extracts components, spacing, and design tokens
              </p>
            </div>
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Generate</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Structured Spec DSL with Tailwind-mapped tokens
              </p>
            </div>
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">4. Deploy</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Copy prompt, export markdown, or download .cursorrules
              </p>
            </div>
          </div>
        </section>

        <section className="border-t py-12 sm:py-16 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">
              Frequently Asked Questions (AI & Design to Prompt)
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-8 sm:mb-12 max-w-xl mx-auto px-2">
              Everything you need to know about converting designs into prompts for Cursor, Claude, and Copilot.
            </p>

            <div className="space-y-4 sm:space-y-6">
              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  What is Designer by Lavaithan?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <strong>Designer by Lavaithan</strong> is an open-source AI developer tool that converts Figma files, UI screenshots, and Git repositories into mathematically accurate, token-efficient IDE prompts. It extracts root container boundaries, AutoLayout parameters, exact coordinates, paddings, and typography to eliminate hallucinated CSS in AI coding models like Cursor, Claude Code, and GitHub Copilot.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  How does it convert Figma designs into prompts?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Designer connects to Figma via OAuth or public design links, unwraps the root canvas artboard, and recursively maps all nested components (navbars, buttons, form inputs, typography, and text content). It then compiles this into a structured 5-part blueprint and downloadable <code>.cursorrules</code> file.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  Can I convert screenshots or design images into code prompts?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Yes. Using Google Gemini 3.5 Flash multimodal vision, Designer inspects high-resolution screenshots to detect spatial boundaries, color palettes, typography, and flex alignments, outputting pixel-accurate Tailwind CSS classes.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  Is Designer by Lavaithan free and open source?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Yes, Designer by Lavaithan is completely free and open-source under the MIT license with no sign-up or credit card required.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="container mx-auto px-4 py-12 sm:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-6 sm:mb-8 px-2">
              Start converting your designs into pixel-perfect IDE prompts
              today. No sign-up required, completely free and open source.
            </p>
            <Link href="/dashboard" className="inline-block w-full sm:w-auto max-w-xs sm:max-w-none">
              <Button size="lg" className="w-full sm:w-auto gap-2 h-11">
                Launch Designer <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p className="leading-relaxed">
            Designer by Lavaithan is open source under the MIT License. Built with Next.js,
            Tailwind CSS, and Gemini 3.5 Flash.
          </p>
        </div>
      </footer>
    </div>
  );
}
