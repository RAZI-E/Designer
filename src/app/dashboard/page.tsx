"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GitBranch,
  FileImage,
  Upload,
  Copy,
  Download,
  Check,
  Loader2,
  Sparkles,
  ArrowLeft,
  Eye,
  Code2,
  FileText,
  Camera,
  Clipboard,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SpecDocument, GeneratedPrompt } from "@/lib/types/spatial";

type InputSource = "image" | "git" | null;
type ProcessingStep = "idle" | "extracting" | "generating" | "complete";

export default function DashboardPage() {
  const [source, setSource] = useState<InputSource>("image");
  const [gitUrl, setGitUrl] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const [step, setStep] = useState<ProcessingStep>("idle");
  const [progress, setProgress] = useState(0);
  const [specDocument, setSpecDocument] = useState<SpecDocument | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgressAnimation = useCallback((targetCap: number, speedMs: number = 220) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetCap) return prev;
        const remaining = targetCap - prev;
        const inc = Math.max(1, Math.min(5, Math.ceil(remaining * 0.15)));
        return Math.min(targetCap, prev + inc);
      });
    }, speedMs);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Global Clipboard Paste (Ctrl+V / Cmd+V) Listener for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setSource("image");
            setImageFile(file);
            const preview = URL.createObjectURL(file);
            setImagePreviewUrl(preview);
            setImageUrl("");
            setError(null);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const resetState = useCallback(() => {
    stopProgressAnimation();
    setSource("image");
    setGitUrl("");
    setGitToken("");
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageUrl("");
    setStep("idle");
    setProgress(0);
    setSpecDocument(null);
    setGeneratedPrompt(null);
    setError(null);
  }, [stopProgressAnimation, imagePreviewUrl]);

  const handleGitAnalyze = async () => {
    if (!gitUrl) return;
    setStep("extracting");
    setProgress(4);
    setError(null);
    startProgressAnimation(48, 200);

    try {
      const response = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: gitUrl, token: gitToken || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze repository");
      }

      const data = await response.json();

      const doc: SpecDocument = {
        source: "git",
        sourceUrl: gitUrl,
        projectName: gitUrl.split("/").pop()?.replace(".git", "") || "project",
        extraction: {
          elements: data.componentSignatures.map((sig: { name: string; path: string; props: string[]; exports: string[]; isDefault: boolean }) => ({
            id: sig.path,
            name: sig.name,
            semanticTag: "div" as const,
            componentType: `React Component (${sig.path})`,
            textContent: sig.props.length > 0 ? `Props: ${sig.props.join(", ")}` : `Component: ${sig.name}`,
            layout: {
              desktop_16_9: {
                positionMode: "flex" as const,
                coordinates: { x: 0, y: 0, width: 1920, height: 1080 },
                viewportPercentage: { top: "0%", left: "0%", width: "100%", height: "100%" },
                margin: [0, 0, 0, 0] as [number, number, number, number],
                padding: [16, 16, 16, 16] as [number, number, number, number],
                alignment: { justify: "start", align: "start" },
              },
            },
            styling: {
              backgroundColor: "transparent",
              borderRadius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0, tailwindEquivalent: "rounded-none" },
              border: { width: 0, style: "none" as const, color: "transparent" },
              effects: { opacity: 1 },
            },
            interactions: {},
          })),
          globalTokens: { colors: {}, fonts: {}, shadows: [], gradients: [] },
        },
        fileTree: data.fileTree,
        gitData: {
          framework: data.framework,
          stylingSolution: data.stylingSolution,
          dependencies: data.dependencies,
          devDependencies: data.devDependencies,
          tailwindConfig: data.tailwindConfig,
          componentSignatures: data.componentSignatures,
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: 1920,
          sourceHeight: 1080,
          totalElements: data.componentSignatures.length,
        },
      };

      setSpecDocument(doc);
      setStep("generating");
      startProgressAnimation(88, 180);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      stopProgressAnimation();
      setProgress(100);
      setTimeout(() => setStep("complete"), 250);
    } catch (err) {
      stopProgressAnimation();
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("idle");
      setProgress(0);
    }
  };

  const handleVisionAnalyze = async () => {
    if (!imageFile && !imageUrl) return;
    setStep("extracting");
    setProgress(4);
    setError(null);
    startProgressAnimation(48, 220);

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrl) {
        formData.append("imageUrl", imageUrl);
      }

      const response = await fetch("/api/analyze-vision", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze image");
      }

      const data = await response.json();

      const doc: SpecDocument = {
        source: "vision",
        projectName: imageFile?.name.replace(/\.[^/.]+$/, "") || "screenshot-analysis",
        extraction: {
          elements: data.elements || [],
          globalTokens: data.globalTokens || { colors: {}, fonts: {}, shadows: [], gradients: [] },
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: data.metadata?.sourceWidth || 1920,
          sourceHeight: data.metadata?.sourceHeight || 1080,
          totalElements: data.metadata?.elementCount || (data.elements?.length ?? 0),
        },
      };

      setSpecDocument(doc);
      setStep("generating");
      startProgressAnimation(88, 180);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      stopProgressAnimation();
      setProgress(100);
      setTimeout(() => setStep("complete"), 250);
    } catch (err) {
      stopProgressAnimation();
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("idle");
      setProgress(0);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      const preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);
      setImageUrl("");
      setError(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isProcessing = step !== "idle" && step !== "complete";

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Back to Home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-90 transition-opacity min-w-0">
              <Image
                src="/logo.png"
                alt="Designer Logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg object-contain shadow-sm shrink-0"
                priority
              />
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-base sm:text-lg font-bold tracking-tight">Designer</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">by Lavaithan</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {step === "complete" && (
              <Button variant="outline" size="sm" onClick={resetState} className="h-8 px-2.5 sm:px-3 text-xs">
                <Sparkles className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">New Analysis</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-5 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Select Input Source</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Upload a screenshot for AI spatial extraction or analyze a GitHub repository.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={source === "image" ? "default" : "outline"}
                    className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 text-center relative"
                    onClick={() => {
                      setSource("image");
                      setError(null);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileImage className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-semibold">Screenshot / Image</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">Multimodal Vision Engine</span>
                    <Badge variant="secondary" className="absolute -top-2 right-2 text-[9px] px-1 py-0 bg-primary/20 text-primary border-primary/30">
                      Recommended
                    </Badge>
                  </Button>

                  <Button
                    variant={source === "git" ? "default" : "outline"}
                    className="h-auto py-3 px-3 flex flex-col items-center gap-1.5 text-center"
                    onClick={() => {
                      setSource("git");
                      setError(null);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="h-4 w-4" />
                      <span className="text-xs sm:text-sm font-semibold">GitHub Repo</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal">Codebase Architecture</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {source === "image" && (
              <Card className="border-primary/30 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      UI Screenshot & Mockup Analysis
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                      <Clipboard className="h-3 w-3" /> Ctrl+V to Paste
                    </Badge>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Upload or paste any UI screenshot. Gemini Multimodal Spatial AI will extract exact pixel coordinates, verbatim text copy, Tailwind design tokens, and components.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="upload">
                    <TabsList className="w-full">
                      <TabsTrigger value="upload" className="flex-1 text-xs">
                        Upload or Paste Image
                      </TabsTrigger>
                      <TabsTrigger value="url" className="flex-1 text-xs">
                        Image URL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4 pt-2">
                      <div
                        className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? "border-primary bg-primary/10 scale-[0.99]"
                            : "border-muted-foreground/30 hover:border-primary/50 bg-muted/10"
                        }`}
                        onClick={() => imageInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground mb-1">
                          {imageFile ? imageFile.name : "Click to browse or Drag & Drop"}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Supports PNG, JPG, WebP, GIF, SVG &bull; Or press <strong>Ctrl+V</strong> anywhere to paste screenshot
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          Snipping Tool / Figma / Web Screenshots Supported
                        </Badge>
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </TabsContent>

                    <TabsContent value="url" className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Public Image URL</label>
                        <Input
                          placeholder="https://example.com/screenshot.png"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setImageFile(null);
                            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                            setImagePreviewUrl(null);
                          }}
                          disabled={isProcessing}
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {imagePreviewUrl && (
                    <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <FileImage className="h-3.5 w-3.5 text-primary" />
                          Screenshot Preview
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground hover:text-destructive gap-1 px-2"
                          onClick={() => {
                            setImageFile(null);
                            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                            setImagePreviewUrl(null);
                            setImageUrl("");
                            if (imageInputRef.current) imageInputRef.current.value = "";
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                      <div className="relative rounded-lg overflow-hidden border max-h-60 bg-black/5 flex items-center justify-center">
                        <img
                          src={imagePreviewUrl}
                          alt="Screenshot preview"
                          className="max-h-60 w-auto object-contain"
                        />
                      </div>
                      {imageFile && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="truncate">{imageFile.name}</span>
                          <span>{(imageFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full h-11 text-xs sm:text-sm font-medium shadow-sm"
                    onClick={handleVisionAnalyze}
                    disabled={(!imageFile && !imageUrl) || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Extracting Design with Gemini Spatial Vision...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Extract Pixel-Accurate Blueprint from Screenshot
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {source === "git" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">GitHub Repository Architecture</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Analyze a GitHub repository to extract components, interfaces, dependencies, and file structures.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Repository URL</label>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      disabled={isProcessing}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium">Personal Access Token (Optional for private repos)</label>
                    <Input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={gitToken}
                      onChange={(e) => setGitToken(e.target.value)}
                      disabled={isProcessing}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <Button
                    className="w-full h-10 text-xs sm:text-sm"
                    onClick={handleGitAnalyze}
                    disabled={!gitUrl || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing Repository...
                      </>
                    ) : (
                      <>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Analyze Repository Architecture
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isProcessing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground/90">
                        {step === "extracting" && (
                          source === "git"
                            ? "Analyzing repository components & structures..."
                            : "Analyzing screenshot layout, typography, & tokens with Gemini Spatial AI..."
                        )}
                        {step === "generating" && "Compiling pixel-accurate IDE prompt & blueprint..."}
                      </span>
                      <span className="tabular-nums font-semibold text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="transition-all duration-200" />
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {step === "complete" && generatedPrompt && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Generated Blueprint</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {generatedPrompt.chunks.length} chunks &bull; ~
                      {generatedPrompt.chunks.reduce((s, c) => s + c.tokenEstimate, 0)} tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="viewport" className="w-full">
                      <div className="w-full overflow-x-auto no-scrollbar pb-1">
                        <TabsList className="w-max sm:w-full flex justify-start sm:justify-center p-1 h-auto">
                          <TabsTrigger value="viewport" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Code2 className="h-3 w-3" />
                            Overview & Tokens
                          </TabsTrigger>
                          <TabsTrigger value="spatial" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Eye className="h-3 w-3" />
                            Spatial Matrix
                          </TabsTrigger>
                          <TabsTrigger value="effects" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Sparkles className="h-3 w-3" />
                            Typography & Copy
                          </TabsTrigger>
                          <TabsTrigger value="responsive" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <FileText className="h-3 w-3" />
                            Responsive
                          </TabsTrigger>
                          <TabsTrigger value="code" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Code2 className="h-3 w-3" />
                            Code
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      <TabsContent value="viewport">
                        <Textarea
                          readOnly
                          className="min-h-75 sm:min-h-100 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.viewportSetup}
                        />
                      </TabsContent>
                      <TabsContent value="spatial">
                        <Textarea
                          readOnly
                          className="min-h-75 sm:min-h-100 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.spatialMatrix}
                        />
                      </TabsContent>
                      <TabsContent value="effects">
                        <Textarea
                          readOnly
                          className="min-h-75 sm:min-h-100 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.microEffects}
                        />
                      </TabsContent>
                      <TabsContent value="responsive">
                        <Textarea
                          readOnly
                          className="min-h-75 sm:min-h-100 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.responsiveRules}
                        />
                      </TabsContent>
                      <TabsContent value="code">
                        <Textarea
                          readOnly
                          className="min-h-75 sm:min-h-100 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.codeGenerationSteps}
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="pt-4 mt-4 border-t flex flex-col sm:flex-row gap-2.5">
                      <Button
                        className="flex-1 text-xs sm:text-sm h-11 font-semibold shadow-sm gap-2"
                        onClick={() =>
                          downloadFile(generatedPrompt.fullBlueprint, "designer-blueprint.md")
                        }
                      >
                        <Download className="h-4 w-4" />
                        Download Full Blueprint (.md)
                      </Button>
                      <Button
                        variant="outline"
                        className="sm:w-auto text-xs sm:text-sm h-11 px-4 gap-2"
                        onClick={() => copyToClipboard(generatedPrompt.fullBlueprint)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied ? "Copied to Clipboard" : "Copy Full Prompt"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Extracted Elements</CardTitle>
                    <CardDescription className="text-xs">
                      {specDocument?.metadata.totalElements} elements detected
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                      {specDocument?.extraction.elements.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg border text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                              {el.semanticTag}
                            </Badge>
                            <span className="truncate font-medium">{el.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                            {el.layout.desktop_16_9.coordinates.width}x{el.layout.desktop_16_9.coordinates.height}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {step === "idle" && !specDocument && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No analysis yet</p>
                    <p className="text-sm max-w-sm mx-auto">
                      Take a screenshot of any UI or design, press <strong>Ctrl+V</strong> to paste or upload it, and get a pixel-accurate IDE prompt instantly.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
