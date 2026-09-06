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

type InputSource = "image" | "git";
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Back to Home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image
                src="/logo.png"
                alt="Designer Logo"
                width={26}
                height={26}
                className="h-6.5 w-6.5 rounded-md object-contain"
                priority
              />
              <span className="text-base font-bold tracking-tight">Designer</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {step === "complete" && (
              <Button variant="outline" size="sm" onClick={resetState} className="h-8 px-3 text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                New Analysis
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-lg border">
              <button
                type="button"
                className={`py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  source === "image"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setSource("image");
                  setError(null);
                }}
              >
                <FileImage className="h-3.5 w-3.5" />
                Screenshot
              </button>
              <button
                type="button"
                className={`py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  source === "git"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setSource("git");
                  setError(null);
                }}
              >
                <GitBranch className="h-3.5 w-3.5" />
                GitHub Repo
              </button>
            </div>

            {source === "image" && (
              <Card className="border shadow-sm">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                    <span className="font-medium text-foreground">Upload or Paste Screenshot</span>
                    <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">Ctrl+V to paste</span>
                  </div>

                  <Tabs defaultValue="upload">
                    <TabsList className="w-full h-8">
                      <TabsTrigger value="upload" className="flex-1 text-xs">
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="url" className="flex-1 text-xs">
                        URL
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-3 pt-2">
                      {imagePreviewUrl && imageFile ? (
                        <div className="p-3 rounded-xl border bg-muted/10 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 truncate max-w-50">
                              <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-medium text-foreground truncate">{imageFile.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-muted-foreground">
                                {(imageFile.size / 1024).toFixed(1)} KB
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                                onClick={() => imageInputRef.current?.click()}
                              >
                                Change
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground hover:text-destructive px-1.5"
                                onClick={() => {
                                  setImageFile(null);
                                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                                  setImagePreviewUrl(null);
                                  setImageUrl("");
                                  if (imageInputRef.current) imageInputRef.current.value = "";
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="relative rounded-lg border max-h-64 bg-black/5 flex items-center justify-center overflow-hidden">
                            <img
                              src={imagePreviewUrl}
                              alt="Uploaded screenshot"
                              className="max-h-64 w-auto object-contain rounded"
                            />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                            isDragging
                              ? "border-primary bg-primary/5"
                              : "border-muted-foreground/25 hover:border-primary/40 bg-muted/5"
                          }`}
                          onClick={() => imageInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                        >
                          <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs font-medium text-foreground">
                            Drop screenshot or click to browse
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            or press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Ctrl+V</kbd> to paste
                          </p>
                        </div>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </TabsContent>

                    <TabsContent value="url" className="space-y-3 pt-2">
                      {imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:image")) && (
                        <div className="p-3 rounded-xl border bg-muted/10 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-50">
                              <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
                              URL Image Preview
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground hover:text-destructive px-1.5"
                              onClick={() => {
                                setImageUrl("");
                                setImageFile(null);
                                if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                                setImagePreviewUrl(null);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="relative rounded-lg border max-h-64 bg-black/5 flex items-center justify-center overflow-hidden">
                            <img
                              src={imageUrl}
                              alt="URL preview"
                              className="max-h-64 w-auto object-contain rounded"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <Input
                        placeholder="https://example.com/screenshot.png"
                        value={imageUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setImageUrl(val);
                          setImageFile(null);
                          if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                          setImagePreviewUrl(null);
                        }}
                        disabled={isProcessing}
                        className="text-xs h-9"
                      />
                    </TabsContent>
                  </Tabs>

                  <Button
                    className="w-full h-10 text-xs font-semibold"
                    onClick={handleVisionAnalyze}
                    disabled={(!imageFile && !imageUrl) || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Extracting Design...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Extract Pixel-Accurate Blueprint
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {source === "git" && (
              <Card className="border shadow-sm">
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Repository URL</label>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      disabled={isProcessing}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Token (Optional)</label>
                    <Input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={gitToken}
                      onChange={(e) => setGitToken(e.target.value)}
                      disabled={isProcessing}
                      className="text-xs h-9"
                    />
                  </div>
                  <Button
                    className="w-full h-10 text-xs font-semibold"
                    onClick={handleGitAnalyze}
                    disabled={!gitUrl || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                        Analyze Repository
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isProcessing && (
              <Card>
                <CardContent className="py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {step === "extracting" ? "Analyzing design..." : "Compiling prompt..."}
                      </span>
                      <span className="font-semibold text-primary tabular-nums">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="py-3">
                  <p className="text-xs text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {step === "complete" && generatedPrompt && (
              <>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Generated Blueprint</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        ~{generatedPrompt.chunks.reduce((s, c) => s + c.tokenEstimate, 0)} tokens
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Tabs defaultValue="viewport" className="w-full">
                      <TabsList className="w-full h-8 flex">
                        <TabsTrigger value="viewport" className="flex-1 text-xs">
                          Tokens
                        </TabsTrigger>
                        <TabsTrigger value="spatial" className="flex-1 text-xs">
                          Spatial
                        </TabsTrigger>
                        <TabsTrigger value="effects" className="flex-1 text-xs">
                          Copy
                        </TabsTrigger>
                        <TabsTrigger value="responsive" className="flex-1 text-xs">
                          Responsive
                        </TabsTrigger>
                        <TabsTrigger value="code" className="flex-1 text-xs">
                          Code
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="viewport" className="pt-2">
                        <Textarea
                          readOnly
                          className="min-h-72 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.viewportSetup}
                        />
                      </TabsContent>
                      <TabsContent value="spatial" className="pt-2">
                        <Textarea
                          readOnly
                          className="min-h-72 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.spatialMatrix}
                        />
                      </TabsContent>
                      <TabsContent value="effects" className="pt-2">
                        <Textarea
                          readOnly
                          className="min-h-72 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.microEffects}
                        />
                      </TabsContent>
                      <TabsContent value="responsive" className="pt-2">
                        <Textarea
                          readOnly
                          className="min-h-72 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.responsiveRules}
                        />
                      </TabsContent>
                      <TabsContent value="code" className="pt-2">
                        <Textarea
                          readOnly
                          className="min-h-72 font-mono text-xs leading-relaxed"
                          value={generatedPrompt.codeGenerationSteps}
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="pt-2 flex gap-2">
                      <Button
                        className="flex-1 h-9 text-xs font-semibold gap-1.5"
                        onClick={() =>
                          downloadFile(generatedPrompt.fullBlueprint, "designer-blueprint.md")
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Full Blueprint (.md)
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 px-3 text-xs gap-1.5"
                        onClick={() => copyToClipboard(generatedPrompt.fullBlueprint)}
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">
                      Extracted Elements ({specDocument?.metadata.totalElements})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {specDocument?.extraction.elements.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center justify-between p-1.5 rounded border text-xs bg-muted/5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 font-normal">
                              {el.semanticTag}
                            </Badge>
                            <span className="truncate font-medium">{el.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
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
              <div className="h-full min-h-64 flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed text-muted-foreground">
                <Sparkles className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm font-medium text-foreground mb-1">Ready for input</p>
                <p className="text-xs max-w-xs text-muted-foreground">
                  Paste a screenshot with <strong>Ctrl+V</strong> or select a source to extract your prompt blueprint.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
