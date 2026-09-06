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
  Clipboard,
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
              width={30}
              height={30}
              className="h-7 w-7 rounded-lg object-contain shadow-sm shrink-0"
              priority
            />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-lg font-bold tracking-tight">Designer</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">by Lavaithan</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/dashboard">
              <Button size="sm" className="px-3 text-xs sm:text-sm h-8">
                Open App
              </Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <section className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-3xl">
          <Badge variant="secondary" className="mb-4 inline-flex items-center text-xs font-medium py-1 px-3">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            AI Design to Prompt
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
            Turn Screenshots into
            <br />
            <span className="text-primary">Pixel-Accurate IDE Prompts</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Extract exact coordinates, verbatim copy, colors, spacing, and Tailwind CSS tokens from screenshots or GitHub repositories for Cursor, Claude, and Copilot.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 h-11 px-6 font-semibold shadow-sm">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://github.com/RAZI-E/Designer" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="h-11 px-5">
                GitHub
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link href="/dashboard" className="group">
              <Card className="h-full border-muted-foreground/20 hover:border-primary/50 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 text-primary">
                    <FileImage className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors flex items-center justify-between">
                    Screenshot Vision
                    <Badge variant="outline" className="text-[10px] font-normal gap-1">
                      <Clipboard className="h-3 w-3" /> Ctrl+V
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Paste or upload any UI screenshot. Extracts layout coordinates, verbatim text, design tokens, and components.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/dashboard" className="group">
              <Card className="h-full border-muted-foreground/20 hover:border-primary/50 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 text-primary">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors">
                    GitHub Architecture
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Analyze codebases to extract component signatures, export interfaces, dependencies, and file structures.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-5 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          Designer by Lavaithan &bull; Free & Open Source
        </div>
      </footer>
    </div>
  );
}
