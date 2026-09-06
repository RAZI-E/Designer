import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GitBranch,
  FileImage,
  Sparkles,
  ArrowRight,
  Layers,
  Palette,
  Code2,
  Zap,
  Camera,
  LayoutGrid,
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
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            AI Screenshot to Prompt • Pixel-Precision Vision Engine
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
            Convert Any Screenshot into
            <br />
            <span className="text-primary">Pixel-Accurate IDE Prompts</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2 leading-relaxed">
            Take a screenshot of any website, design mockup, or app, and let our Multimodal Vision AI extract exact component coordinates, verbatim text copy, Tailwind design tokens, and layout structures for Cursor, Claude Code, and Copilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xs sm:max-w-none mx-auto">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-sm sm:text-base h-11">
                Upload Screenshot to Prompt <ArrowRight className="h-4 w-4" />
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
            Two Powerful Input Modes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <FileImage className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Screenshot & Image Vision Engine</CardTitle>
                <CardDescription className="text-sm">
                  Paste or upload any UI screenshot. Gemini Multimodal Vision extracts exact pixel coordinates, verbatim typography text, hex color palettes, and responsive breakdowns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Instant Clipboard Paste (Ctrl+V):</strong> Paste screenshots directly without saving files.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Verbatim Text Copy:</strong> Extracts every button label, heading, and description.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Pixel-Accurate Spacing:</strong> Detects margins, paddings, flex gaps, and border-radii.
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <GitBranch className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">GitHub Repository Architecture</CardTitle>
                <CardDescription className="text-sm">
                  Analyze any public GitHub repo to extract component signatures, export interfaces, dependencies, file trees, and Tailwind configurations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Component Detection:</strong> Extracts TypeScript props and interfaces.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>File Tree Mapping:</strong> Full hierarchy preservation for IDE context.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <strong>Tailwind & Dependency Analysis:</strong> Extracts design tokens from existing codebases.
                  </li>
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
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">1. Snap / Paste</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Take a screenshot of any UI or design and paste it with Ctrl+V.
              </p>
            </div>
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">2. Vision Extraction</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gemini extracts every color, font, button, container, and verbatim copy.
              </p>
            </div>
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">3. Prompt Compilation</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Compiles a structured blueprint with Tailwind classes and CSS variables.
              </p>
            </div>
            <div className="text-center p-4 rounded-xl border sm:border-0 bg-card/40 sm:bg-transparent">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">4. Generate in IDE</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Feed the prompt into Cursor, Claude, or Copilot for pixel-perfect code.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t py-12 sm:py-16 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-8 sm:mb-12 max-w-xl mx-auto px-2">
              Learn how Designer creates pixel-faithful IDE prompts from screenshots and GitHub code.
            </p>

            <div className="space-y-4 sm:space-y-6">
              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  How does screenshot to prompt work?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Designer uses advanced Multimodal Spatial Vision AI to inspect your screenshot. It identifies all visual containers, measures bounding box coordinates, extracts typography hierarchy, reads verbatim text, and translates everything into Tailwind CSS utility classes and CSS tokens.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  Does the generated prompt prevent hallucinated designs?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Yes! The blueprint includes strict execution directives, full spatial matrices with exact coordinates (x, y, w, h), exact padding/margin values, and verbatim text copy, instructing the AI developer to replicate the exact design without inventing new layouts.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border bg-card">
                <h3 className="font-semibold text-sm sm:text-base mb-2">
                  Is Designer free and open-source?
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
              Ready to Turn Screenshots into Pixel-Perfect Code?
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-6 sm:mb-8 px-2">
              Start converting your screenshots and repos into pixel-accurate IDE prompts today.
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
            Tailwind CSS, and Gemini Multimodal Vision.
          </p>
        </div>
      </footer>
    </div>
  );
}
