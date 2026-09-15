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
  AlertCircle,
  RefreshCw,
  Film,
  User,
  HelpCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SpecDocument, GeneratedPrompt } from "@/lib/types/spatial";

type InputSource = "image" | "git";
type ProcessingStep = "idle" | "extracting" | "interview" | "generating" | "complete";

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
  const [astData, setAstData] = useState<any | null>(null);
  const [userAssetResponses, setUserAssetResponses] = useState<
    Record<string, { preference: string; customUrl?: string; videoDetails?: string }>
  >({});
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cleanErrorMessage = (err: any): string => {
    if (!err) return "An unexpected error occurred.";
    const raw = typeof err === "string" ? err : err.message || JSON.stringify(err);
    if (
      raw.includes("503") ||
      raw.includes("high demand") ||
      raw.includes("UNAVAILABLE") ||
      raw.includes("spikes in demand") ||
      raw.includes("temporarily unavailable")
    ) {
      return "Google Gemini is currently experiencing a high demand spike. All fallback models were attempted. Please click 'Retry Analysis' in a few seconds.";
    }
    if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota") || raw.includes("rate limit")) {
      return "API rate limit reached. Please wait a few seconds and click 'Retry Analysis'.";
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        return typeof parsed.error === "string" ? parsed.error : parsed.error.message || raw;
      }
    } catch {
      // ignore
    }
    return raw;
  };

  const imageInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentProgressRef = useRef<number>(0);

  // Smooth, organic progress animation that advances naturally and never freezes
  const startProgressAnimation = useCallback((expectedDurationMs: number = 13000) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    const startTime = Date.now();
    currentProgressRef.current = 6;
    setProgress(6);

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = elapsed / expectedDurationMs;

      let nextProgress: number;
      if (ratio < 1) {
        // Natural ease-out curve: steadily progresses from 6% to ~90% across expected duration
        nextProgress = Math.round(6 + 84 * (1 - Math.pow(1 - ratio, 1.7)));
      } else {
        // Asymptotic crawl beyond expected time: 90% -> 96% with steady micro-ticks so it never appears stuck
        const extraSecs = (elapsed - expectedDurationMs) / 1000;
        nextProgress = Math.min(96, Math.round(90 + 6 * (1 - Math.exp(-extraSecs / 8))));
      }

      currentProgressRef.current = Math.max(currentProgressRef.current, nextProgress);
      setProgress(currentProgressRef.current);
    }, 100);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  // Smoothly glide from current progress to 100% over ~280ms, then pause briefly for visual confirmation
  const finishProgressAnimation = useCallback(async (): Promise<void> => {
    stopProgressAnimation();
    return new Promise((resolve) => {
      const start = currentProgressRef.current;
      const duration = 280;
      const startTime = Date.now();

      const finishInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const current = Math.round(start + (100 - start) * t);
        currentProgressRef.current = current;
        setProgress(current);

        if (t >= 1) {
          clearInterval(finishInterval);
          setTimeout(() => {
            resolve();
          }, 180);
        }
      }, 30);
    });
  }, [stopProgressAnimation]);

  const getProgressStatus = (currentStep: ProcessingStep, currentProgress: number): string => {
    if (currentStep === "extracting") {
      if (currentProgress < 25) return "Scanning canvas & layout structure...";
      if (currentProgress < 50) return "Deconstructing components & typography...";
      if (currentProgress < 75) return "Detecting media assets & color tokens...";
      if (currentProgress < 94) return "Synthesizing pixel-accurate specification...";
      if (currentProgress < 100) return "Finalizing design AST...";
      return "Analysis complete!";
    }
    if (currentStep === "generating") {
      if (currentProgress < 40) return "Compiling prompt blueprint...";
      if (currentProgress < 80) return "Structuring asset protocols & layout scaffolds...";
      if (currentProgress < 100) return "Finalizing IDE instructions...";
      return "Blueprint ready!";
    }
    return "Processing...";
  };

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
    setAstData(null);
    setUserAssetResponses({});
    setGeneratedPrompt(null);
    setError(null);
  }, [stopProgressAnimation, imagePreviewUrl]);

  const handleGitAnalyze = async () => {
    if (!gitUrl) return;
    setStep("extracting");
    setError(null);
    startProgressAnimation(4000);

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
      startProgressAnimation(1200);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      await finishProgressAnimation();
      setStep("complete");
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
    setError(null);
    setRetryStatus(null);
    startProgressAnimation(13000);

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrl) {
        formData.append("imageUrl", imageUrl);
      }

      let response = await fetch("/api/analyze-vision", {
        method: "POST",
        body: formData,
      });

      // If server returns 503 or 429, attempt one fast automatic client retry after short delay
      if (!response.ok && (response.status === 503 || response.status === 429)) {
        setRetryStatus("High model traffic detected. Auto-retrying with fallback in 2s...");
        await new Promise((r) => setTimeout(r, 2200));
        setRetryStatus("Retrying analysis now...");
        response = await fetch("/api/analyze-vision", {
          method: "POST",
          body: formData,
        });
      }
      setRetryStatus(null);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to analyze image (status ${response.status})`);
      }

      const data = await response.json();

      if (data.ast) {
        setAstData(data.ast);
        await finishProgressAnimation();

        // Initialize default responses for detected media assets
        const initialResponses: Record<string, { preference: string; customUrl?: string; videoDetails?: string }> = {};
        (data.ast.mediaAssets || []).forEach((asset: any) => {
          initialResponses[asset.id] = {
            preference: "ask_ide",
            customUrl: "",
          };
        });
        initialResponses["__general_video"] = {
          preference: "no",
          videoDetails: "",
        };
        setUserAssetResponses(initialResponses);

        setStep("interview");
        return;
      }

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
      startProgressAnimation(1200);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      await finishProgressAnimation();
      setStep("complete");
    } catch (err) {
      stopProgressAnimation();
      setRetryStatus(null);
      setError(cleanErrorMessage(err));
      setStep("idle");
      setProgress(0);
    }
  };

  const handleGenerateFinalBlueprint = async (customResponses?: any) => {
    if (!astData) return;
    setStep("generating");
    setError(null);
    startProgressAnimation(1000);

    try {
      const responsesToUse = customResponses || userAssetResponses;
      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ast: astData, userAssetResponses: responsesToUse }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      await finishProgressAnimation();
      setStep("complete");
    } catch (err) {
      stopProgressAnimation();
      setError(cleanErrorMessage(err));
      setStep("interview");
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
                      {imageUrl && (
                        <div className="p-3 rounded-xl border bg-muted/10 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-50">
                              <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
                              {imageUrl.match(/\.(png|jpg|jpeg|webp|svg|gif)($|\?)/i) || imageUrl.startsWith("data:image/")
                                ? "Image URL Preview"
                                : (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
                                  ? "Website URL (Live Capture)"
                                  : "Design Source")}
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
                          {(imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:image")) && (
                            <div className="relative rounded-lg border max-h-64 bg-black/5 flex items-center justify-center overflow-hidden">
                              <img
                                src={
                                  imageUrl.match(/\.(png|jpg|jpeg|webp|svg|gif)($|\?)/i) || imageUrl.startsWith("data:image/")
                                    ? imageUrl
                                    : `https://s0.wp.com/mshots/v1/${encodeURIComponent(imageUrl)}?w=800`
                                }
                                alt="Design preview"
                                className="max-h-64 w-auto object-contain rounded"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <Input
                        placeholder="Enter website URL (e.g. https://stripe.com) or image link"
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
                <CardContent className="py-4 space-y-2.5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        {getProgressStatus(step, progress)}
                      </span>
                      <span className="font-semibold text-primary tabular-nums">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                  {retryStatus && (
                    <div className="flex items-center gap-2 text-[11px] text-amber-500 bg-amber-500/10 px-2.5 py-1.5 rounded-md border border-amber-500/20">
                      <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                      <span>{retryStatus}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
                <CardContent className="py-3.5 px-4 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-semibold text-destructive">
                        {error.includes("demand") || error.includes("Gemini") || error.includes("traffic")
                          ? "Temporary Model Demand Spike"
                          : "Analysis Error"}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </div>
                  {(imageFile || imageUrl) && (
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-destructive hover:text-destructive"
                        onClick={handleVisionAnalyze}
                        disabled={isProcessing}
                      >
                        <RefreshCw className={`h-3 w-3 ${isProcessing ? "animate-spin" : ""}`} />
                        Retry Analysis
                      </Button>
                    </div>
                  )}
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

                {astData ? (
                  <Card className="border shadow-xs bg-card">
                    <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Components ({astData.components?.length || 0})
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full border shadow-xs"
                            style={{ backgroundColor: astData.theme?.backgroundBaseHex }}
                            title={`Base: ${astData.theme?.backgroundBaseHex}`}
                          />
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full border shadow-xs"
                            style={{ backgroundColor: astData.theme?.primaryAccentHex }}
                            title={`Accent: ${astData.theme?.primaryAccentHex}`}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {astData.typography?.suggestedGoogleFontHeading || "Heading"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {astData.components?.map((c: any, idx: number) => (
                          <div
                            key={c.id || idx}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-md hover:bg-muted/30 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                                {c.type}
                              </Badge>
                              {c.exactContent && (
                                <span className="text-[11px] text-foreground truncate max-w-56 font-medium">
                                  {c.exactContent}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                              {c.placement?.alignment || "layout"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {astData.backgroundArtAndDecorations && astData.backgroundArtAndDecorations.length > 0 && (
                        <div className="pt-2 mt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-medium">Background Art:</span>
                          <div className="flex items-center gap-1.5 truncate max-w-64">
                            {astData.backgroundArtAndDecorations.map((art: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                                {art.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : specDocument ? (
                  <Card className="border shadow-xs bg-card">
                    <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Elements ({specDocument?.metadata.totalElements})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {specDocument?.extraction.elements.map((el) => (
                          <div
                            key={el.id}
                            className="flex items-center justify-between py-1 px-2.5 rounded-md hover:bg-muted/30 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal shrink-0">
                                {el.semanticTag}
                              </Badge>
                              <span className="truncate font-medium text-foreground">{el.name}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                              {el.layout.desktop_16_9.coordinates.width}x{el.layout.desktop_16_9.coordinates.height}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}

            {step === "interview" && astData && (
              <Card className="border shadow-xs bg-card">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">Media Assets</CardTitle>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {astData.mediaAssets?.length || 0}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Select how IDE handles each asset</span>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* Compact Asset List */}
                  {astData.mediaAssets && astData.mediaAssets.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {astData.mediaAssets.map((asset: any) => {
                        const currentResp = userAssetResponses[asset.id] || { preference: "ask_ide", customUrl: "" };
                        return (
                          <div key={asset.id} className="p-2.5 rounded-lg border bg-muted/10 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {asset.type === "avatar" ? (
                                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : asset.type === "video" ? (
                                  <Film className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <FileImage className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                                <span className="text-xs font-medium text-foreground truncate" title={asset.title}>
                                  {asset.title}
                                </span>
                              </div>

                              {/* Segmented Control */}
                              <div className="flex items-center p-0.5 rounded-md bg-muted/60 border text-[11px] shrink-0">
                                <button
                                  type="button"
                                  className={`px-2 py-0.5 rounded transition-all ${
                                    currentResp.preference === "ask_ide"
                                      ? "bg-background text-foreground font-medium shadow-xs"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  onClick={() => {
                                    setUserAssetResponses(prev => ({
                                      ...prev,
                                      [asset.id]: { ...prev[asset.id], preference: "ask_ide" }
                                    }));
                                  }}
                                >
                                  Ask IDE
                                </button>
                                <button
                                  type="button"
                                  className={`px-2 py-0.5 rounded transition-all ${
                                    currentResp.preference === "provide"
                                      ? "bg-background text-foreground font-medium shadow-xs"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  onClick={() => {
                                    setUserAssetResponses(prev => ({
                                      ...prev,
                                      [asset.id]: { ...prev[asset.id], preference: "provide" }
                                    }));
                                  }}
                                >
                                  URL
                                </button>
                                <button
                                  type="button"
                                  className={`px-2 py-0.5 rounded transition-all ${
                                    currentResp.preference === "svg_placeholder"
                                      ? "bg-background text-foreground font-medium shadow-xs"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  onClick={() => {
                                    setUserAssetResponses(prev => ({
                                      ...prev,
                                      [asset.id]: { ...prev[asset.id], preference: "svg_placeholder" }
                                    }));
                                  }}
                                >
                                  Mock
                                </button>
                              </div>
                            </div>

                            {currentResp.preference === "provide" && (
                              <Input
                                placeholder="Asset URL or path (e.g. /hero.png)"
                                value={currentResp.customUrl || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUserAssetResponses(prev => ({
                                    ...prev,
                                    [asset.id]: { ...prev[asset.id], customUrl: val }
                                  }));
                                }}
                                className="text-xs h-7"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No external media detected.
                    </p>
                  )}

                  {/* Minimal Video Option */}
                  <div className="flex items-center justify-between pt-1 border-t text-xs">
                    <span className="text-muted-foreground">Video Embed</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                          userAssetResponses["__general_video"]?.preference !== "yes"
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => {
                          setUserAssetResponses(prev => ({
                            ...prev,
                            __general_video: { preference: "no", videoDetails: "" }
                          }));
                        }}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                          userAssetResponses["__general_video"]?.preference === "yes"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => {
                          setUserAssetResponses(prev => ({
                            ...prev,
                            __general_video: { preference: "yes", videoDetails: "" }
                          }));
                        }}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {userAssetResponses["__general_video"]?.preference === "yes" && (
                    <Input
                      placeholder="Video URL or embed instructions"
                      value={userAssetResponses["__general_video"]?.videoDetails || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserAssetResponses(prev => ({
                          ...prev,
                          __general_video: { preference: "yes", videoDetails: val }
                        }));
                      }}
                      className="text-xs h-7"
                    />
                  )}

                  {/* Single Action Button */}
                  <Button
                    className="w-full h-9 text-xs font-semibold mt-2"
                    onClick={() => handleGenerateFinalBlueprint()}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate Blueprint
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === "idle" && !specDocument && !astData && (
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
