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
  PenTool,
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
  Unlink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { FigmaProjectSelector } from "@/components/figma/figma-project-selector";
import type { SpecDocument, GeneratedPrompt } from "@/lib/types/spatial";

type InputSource = "git" | "figma" | "image" | null;
type ProcessingStep = "idle" | "extracting" | "generating" | "complete";

export default function DashboardPage() {
  const [source, setSource] = useState<InputSource>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaPat, setFigmaPat] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const [step, setStep] = useState<ProcessingStep>("idle");
  const [progress, setProgress] = useState(0);
  const [specDocument, setSpecDocument] = useState<SpecDocument | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [figmaConnected, setFigmaConnected] = useState(false);
  const [figmaChecking, setFigmaChecking] = useState(true);

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
    };
  }, []);

  const [patConnecting, setPatConnecting] = useState(false);
  const [patError, setPatError] = useState<string | null>(null);
  const [connectMethod, setConnectMethod] = useState<"oauth" | "pat">("oauth");

  useEffect(() => {
    checkFigmaAuth();
    const params = new URLSearchParams(window.location.search);
    if (params.get("figma_error")) {
      setError(params.get("figma_error"));
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("figma_connected")) {
      setFigmaConnected(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  const connectFigmaPat = async (tokenToUse?: string) => {
    const token = (tokenToUse || figmaPat).trim();
    if (!token) return;
    setPatConnecting(true);
    setPatError(null);
    try {
      const res = await fetch("/api/figma/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid Personal Access Token");
      }
      setFigmaConnected(true);
      setFigmaPat(token);
      localStorage.setItem("ep_figma_pat", token);
    } catch (err) {
      setPatError(err instanceof Error ? err.message : "Failed to connect with token");
    } finally {
      setPatConnecting(false);
    }
  };

  const checkFigmaAuth = async () => {
    try {
      const res = await fetch("/api/figma/token");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && !data.expired) {
          setFigmaConnected(true);
          return;
        }
      }
      // Check saved PAT fallback
      const savedPat = localStorage.getItem("ep_figma_pat");
      if (savedPat) {
        setFigmaPat(savedPat);
        await connectFigmaPat(savedPat);
      } else {
        setFigmaConnected(false);
      }
    } catch {
      setFigmaConnected(false);
    } finally {
      setFigmaChecking(false);
    }
  };

  const [selectedOauthScope, setSelectedOauthScope] = useState<"file_content:read" | "files:read">("file_content:read");

  const connectFigma = (scopeOverride?: string) => {
    const params = new URLSearchParams();
    params.set("redirect_to", "/dashboard");
    params.set("scope", scopeOverride || selectedOauthScope);
    window.location.href = `/api/figma/authorize?${params.toString()}`;
  };

  const disconnectFigma = async () => {
    await fetch("/api/figma/revoke", { method: "POST" });
    localStorage.removeItem("ep_figma_pat");
    setFigmaPat("");
    setFigmaConnected(false);
  };

  const resetState = useCallback(() => {
    stopProgressAnimation();
    setSource(null);
    setGitUrl("");
    setGitToken("");
    setFigmaUrl("");
    setFigmaPat("");
    setImageFile(null);
    setImageUrl("");
    setStep("idle");
    setProgress(0);
    setSpecDocument(null);
    setGeneratedPrompt(null);
    setError(null);
  }, [stopProgressAnimation]);

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
          elements: data.componentSignatures.map((sig: { name: string; path: string }) => ({
            id: sig.path,
            name: sig.name,
            semanticTag: "div" as const,
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

  const handleFigmaAnalyze = async (urlOverride?: string) => {
    const targetUrl = urlOverride || figmaUrl;
    if (!targetUrl) return;
    setFigmaUrl(targetUrl);
    setStep("extracting");
    setProgress(4);
    setError(null);
    startProgressAnimation(48, 220);

    try {
      const response = await fetch("/api/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: targetUrl, personalAccessToken: figmaPat || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.needsAuth) {
          setFigmaConnected(false);
          throw new Error("Please connect your Figma account first.");
        }
        throw new Error(data.error || "Failed to parse Figma file");
      }

      const data = await response.json();

      const extractedElements = data.elements || data.components || [];
      const extractedTokens = data.globalTokens || data.designTokens || { colors: {}, fonts: {}, shadows: [], gradients: [] };

      const doc: SpecDocument = {
        source: "figma",
        sourceUrl: targetUrl,
        projectName: data.metadata?.fileName || "figma-design",
        extraction: {
          elements: extractedElements,
          globalTokens: extractedTokens,
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: data.metadata?.width || 1920,
          sourceHeight: data.metadata?.height || 1080,
          totalElements: data.metadata?.totalComponents || extractedElements.length,
        },
      };

      // Save to recent projects
      try {
        const fileKeyMatch = targetUrl.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
        if (fileKeyMatch) {
          const key = fileKeyMatch[1];
          const stored = localStorage.getItem("ep_recent_figma_projects");
          const recents = stored ? JSON.parse(stored) : [];
          const newItem = {
            id: key,
            fileKey: key,
            name: data.metadata?.fileName || "Figma Design",
            url: targetUrl,
            projectName: "Figma File",
            lastModified: new Date().toISOString(),
            isRecent: true,
          };
          const updated = [newItem, ...recents.filter((r: any) => r.fileKey !== key)].slice(0, 15);
          localStorage.setItem("ep_recent_figma_projects", JSON.stringify(updated));
        }
      } catch (err) {
        console.warn("Could not save to recent Figma projects:", err);
      }

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
    if (!imageFile) return;
    setStep("extracting");
    setProgress(4);
    setError(null);
    startProgressAnimation(48, 220);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

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
        projectName: imageFile.name.replace(/\.[^/.]+$/, "") || "design-analysis",
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImageUrl(file.name);
    }
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
            {figmaConnected && (
              <Button variant="ghost" size="sm" onClick={disconnectFigma} className="h-8 px-2 sm:px-3 text-xs">
                <Unlink className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Disconnect Figma</span>
              </Button>
            )}
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
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Select Input Source</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Choose a design source to analyze and convert into IDE prompts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <Button
                    variant={source === "git" ? "default" : "outline"}
                    className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 p-1 sm:p-2 text-xs sm:text-sm"
                    onClick={() => setSource("git")}
                    disabled={isProcessing}
                  >
                    <GitBranch className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="truncate">Git Repo</span>
                  </Button>
                  <Button
                    variant={source === "figma" ? "default" : "outline"}
                    className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 p-1 sm:p-2 text-xs sm:text-sm"
                    onClick={() => setSource("figma")}
                    disabled={isProcessing}
                  >
                    <PenTool className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="truncate">Figma</span>
                  </Button>
                  <Button
                    variant={source === "image" ? "default" : "outline"}
                    className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 p-1 sm:p-2 text-xs sm:text-sm"
                    onClick={() => setSource("image")}
                    disabled={isProcessing}
                  >
                    <FileImage className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="truncate">Design Image</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {source === "git" && (
              <Card>
                <CardHeader>
                  <CardTitle>GitHub Repository</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Repository URL</label>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      GitHub Token <span className="text-muted-foreground">(optional, for private repos)</span>
                    </label>
                    <Input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={gitToken}
                      onChange={(e) => setGitToken(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <Button
                    className="w-full"
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
                        <GitBranch className="h-4 w-4 mr-2" />
                        Analyze Repository
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {source === "figma" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <PenTool className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm sm:text-base font-semibold">Figma Design</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground truncate">
                          Import workspace files or paste a direct design link
                        </CardDescription>
                      </div>
                    </div>
                    {figmaConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {figmaChecking ? (
                    <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Checking Figma connection...
                    </div>
                  ) : figmaConnected ? (
                    <FigmaProjectSelector
                      onSelectProject={(url) => handleFigmaAnalyze(url)}
                      onDisconnect={disconnectFigma}
                      isProcessing={isProcessing}
                      activeProcessingUrl={figmaUrl}
                    />
                  ) : (
                    <div className="space-y-3.5">
                      {/* Dual Connect Options (OAuth or Token on Any Device) */}
                      <div className="p-3 sm:p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-foreground">Connect Figma Account</p>
                            <p className="text-[11px] text-muted-foreground">Access your files on any device via OAuth or Token</p>
                          </div>
                          <div className="flex items-center p-0.5 bg-background/60 rounded-md border text-[11px] shrink-0">
                            <button
                              type="button"
                              onClick={() => setConnectMethod("oauth")}
                              className={`px-2 py-0.5 rounded transition-all ${
                                connectMethod === "oauth" ? "bg-primary text-primary-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              OAuth
                            </button>
                            <button
                              type="button"
                              onClick={() => setConnectMethod("pat")}
                              className={`px-2 py-0.5 rounded transition-all ${
                                connectMethod === "pat" ? "bg-primary text-primary-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              Token
                            </button>
                          </div>
                        </div>

                        {connectMethod === "oauth" ? (
                          <div className="space-y-2.5 pt-1 border-t border-border/40">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                              <span className="text-muted-foreground text-[11px] font-medium">OAuth Scope:</span>
                              <div className="flex items-center gap-1 bg-muted/70 p-0.5 rounded border border-border/60 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOauthScope("file_content:read")}
                                  className={`px-2 py-0.5 rounded transition-all font-mono ${
                                    selectedOauthScope === "file_content:read"
                                      ? "bg-background text-foreground font-semibold shadow-xs"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  file_content:read (Standard)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedOauthScope("files:read")}
                                  className={`px-2 py-0.5 rounded transition-all font-mono ${
                                    selectedOauthScope === "files:read"
                                      ? "bg-background text-foreground font-semibold shadow-xs"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  files:read (Legacy)
                                </button>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => connectFigma(selectedOauthScope)}
                              className="w-full h-8.5 text-xs font-medium shadow-xs"
                            >
                              <PenTool className="h-3.5 w-3.5 mr-1.5" />
                              Authorize with Figma ({selectedOauthScope})
                            </Button>

                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              If Figma reports <em>&quot;Invalid scopes for app&quot;</em>, your app in{" "}
                              <a
                                href="https://www.figma.com/developers/apps"
                                target="_blank"
                                rel="noreferrer"
                                className="underline text-primary hover:opacity-80"
                              >
                                Figma Developer Hub
                              </a>{" "}
                              has a different scope enabled. Switch to the matching scope above, or use <strong>Token</strong> mode for instant access on any device.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 border-t border-border/40">
                            <div className="flex gap-2">
                              <Input
                                type="password"
                                placeholder="figd_... (Personal Access Token)"
                                value={figmaPat}
                                onChange={(e) => {
                                  setFigmaPat(e.target.value);
                                  setPatError(null);
                                }}
                                className="h-8 text-xs font-mono"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && figmaPat.trim()) connectFigmaPat();
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => connectFigmaPat()}
                                disabled={!figmaPat.trim() || patConnecting}
                                className="h-8 px-3 text-xs font-medium shrink-0"
                              >
                                {patConnecting ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    Connecting...
                                  </>
                                ) : (
                                  "Connect"
                                )}
                              </Button>
                            </div>
                            {patError && <p className="text-[11px] text-destructive">{patError}</p>}
                            <p className="text-[10px] text-muted-foreground">
                              Works on all devices without redirect URLs. Get token in Figma &gt; Settings &gt; Account.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Minimal Divider */}
                      <div className="relative flex items-center py-0.5">
                        <div className="grow border-t border-border/60" />
                        <span className="shrink-0 px-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">or import link</span>
                        <div className="grow border-t border-border/60" />
                      </div>

                      {/* Direct URL and PAT Inputs */}
                      <div className="space-y-2.5">
                        <Input
                          placeholder="https://www.figma.com/design/..."
                          value={figmaUrl}
                          onChange={(e) => setFigmaUrl(e.target.value)}
                          disabled={isProcessing}
                          className="h-9 text-xs font-mono"
                        />

                        <Input
                          type="password"
                          placeholder="Personal Access Token (optional, for private files)"
                          value={figmaPat}
                          onChange={(e) => setFigmaPat(e.target.value)}
                          disabled={isProcessing}
                          className="h-8 text-xs font-mono"
                        />

                        <Button
                          className="w-full h-9 text-xs font-medium"
                          onClick={() => handleFigmaAnalyze()}
                          disabled={!figmaUrl || isProcessing || (!figmaConnected && !figmaPat)}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              Extracting Blueprint...
                            </>
                          ) : (
                            <>
                              <PenTool className="h-3.5 w-3.5 mr-1.5" />
                              Extract Blueprint
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {source === "image" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-primary" />
                    Design Image Upload
                  </CardTitle>
                  <CardDescription>
                    Upload a design mockup or screenshot to extract layout coordinates, component signatures, and design tokens using Gemini 3.5 Flash.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="upload">
                    <TabsList className="w-full">
                      <TabsTrigger value="upload" className="flex-1">
                        Upload Image
                      </TabsTrigger>
                      <TabsTrigger value="url" className="flex-1">
                        Image URL
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-4">
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/10"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          {imageFile ? imageFile.name : "Click to upload design image"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WebP, GIF, SVG
                        </p>
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </TabsContent>
                    <TabsContent value="url" className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Image URL</label>
                        <Input
                          placeholder="https://example.com/design.png"
                          value={imageUrl && imageFile ? "" : imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setImageFile(null);
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {imageFile && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileImage className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate font-medium">{imageFile.name}</span>
                        <span className="text-muted-foreground">({(imageFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setImageFile(null);
                          setImageUrl("");
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleVisionAnalyze}
                    disabled={!imageFile || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing Design...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Analyze Design with Gemini 3.5 Flash
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
                            : source === "figma"
                            ? "Parsing Figma design & extracting spatial tokens..."
                            : "Analyzing layout & design tokens with Gemini 3.5 Flash..."
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base sm:text-lg">Generated Blueprint</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {generatedPrompt.chunks.length} chunks &bull; ~
                          {generatedPrompt.chunks.reduce((s, c) => s + c.tokenEstimate, 0)} tokens
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-initial h-8 text-xs"
                          onClick={() => copyToClipboard(generatedPrompt.fullBlueprint)}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-initial h-8 text-xs"
                          onClick={() =>
                            downloadFile(generatedPrompt.fullBlueprint, "designer-blueprint.md")
                          }
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="viewport" className="w-full">
                      <div className="w-full overflow-x-auto no-scrollbar pb-1">
                        <TabsList className="w-max sm:w-full flex justify-start sm:justify-center p-1 h-auto">
                          <TabsTrigger value="viewport" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Code2 className="h-3 w-3" />
                            Viewport
                          </TabsTrigger>
                          <TabsTrigger value="spatial" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Eye className="h-3 w-3" />
                            Spatial
                          </TabsTrigger>
                          <TabsTrigger value="effects" className="gap-1 text-xs py-1.5 px-2.5 sm:px-3">
                            <Sparkles className="h-3 w-3" />
                            Effects
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
                        <div className="space-y-3">
                          <Textarea
                            readOnly
                            className="min-h-60 sm:min-h-75 font-mono text-xs leading-relaxed"
                            value={generatedPrompt.codeGenerationSteps}
                          />
                          <Button
                            variant="outline"
                            className="w-full text-xs sm:text-sm h-10"
                            onClick={() =>
                              downloadFile(generatedPrompt.fullBlueprint, "designer-blueprint.md")
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Full Blueprint
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
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
                    <p className="text-sm">
                      Select an input source and provide your design to generate
                      a pixel-accurate implementation blueprint.
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
