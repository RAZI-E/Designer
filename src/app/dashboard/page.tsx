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
import type { SpecDocument, GeneratedPrompt } from "@/lib/types/spatial";

type InputSource = "git" | "figma" | "psd" | null;
type ProcessingStep = "idle" | "extracting" | "generating" | "complete";

export default function DashboardPage() {
  const [source, setSource] = useState<InputSource>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaPat, setFigmaPat] = useState("");
  const [psdFile, setPsdFile] = useState<File | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const checkFigmaAuth = async () => {
    try {
      const res = await fetch("/api/figma/token");
      if (res.ok) {
        const data = await res.json();
        setFigmaConnected(data.authenticated && !data.expired);
      }
    } catch {
      setFigmaConnected(false);
    } finally {
      setFigmaChecking(false);
    }
  };

  const connectFigma = () => {
    const params = new URLSearchParams();
    params.set("redirect_to", "/dashboard");
    window.location.href = `/api/figma/authorize?${params.toString()}`;
  };

  const disconnectFigma = async () => {
    await fetch("/api/figma/revoke", { method: "POST" });
    setFigmaConnected(false);
  };

  const resetState = useCallback(() => {
    setSource(null);
    setGitUrl("");
    setGitToken("");
    setFigmaUrl("");
    setFigmaPat("");
    setPsdFile(null);
    setImageFile(null);
    setImageUrl("");
    setStep("idle");
    setProgress(0);
    setSpecDocument(null);
    setGeneratedPrompt(null);
    setError(null);
  }, []);

  const handleGitAnalyze = async () => {
    if (!gitUrl) return;
    setStep("extracting");
    setProgress(20);
    setError(null);

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
      setProgress(50);

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
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      setProgress(100);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("idle");
      setProgress(0);
    }
  };

  const handleFigmaAnalyze = async () => {
    if (!figmaUrl) return;
    setStep("extracting");
    setProgress(20);
    setError(null);

    try {
      const response = await fetch("/api/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: figmaUrl, personalAccessToken: figmaPat || undefined }),
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
      setProgress(50);

      const extractedElements = data.elements || data.components || [];
      const extractedTokens = data.globalTokens || data.designTokens || { colors: {}, fonts: {}, shadows: [], gradients: [] };

      const doc: SpecDocument = {
        source: "figma",
        sourceUrl: figmaUrl,
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

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      setProgress(100);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("idle");
      setProgress(0);
    }
  };

  const handlePsdAnalyze = async () => {
    if (!psdFile) return;
    setStep("extracting");
    setProgress(20);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", psdFile);

      const response = await fetch("/api/analyze-psd", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to parse PSD file");
      }

      const data = await response.json();
      setProgress(50);

      const doc: SpecDocument = {
        source: "psd",
        projectName: psdFile.name.replace(".psd", ""),
        extraction: {
          elements: data.components || [],
          globalTokens: { colors: {}, fonts: {}, shadows: [], gradients: [] },
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: data.metadata.width,
          sourceHeight: data.metadata.height,
          totalElements: data.metadata.totalComponents,
        },
      };

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      setProgress(100);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("idle");
      setProgress(0);
    }
  };

  const handleVisionAnalyze = async () => {
    if (!imageFile) return;
    setStep("extracting");
    setProgress(20);
    setError(null);

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
      setProgress(50);

      const doc: SpecDocument = {
        source: "vision",
        projectName: "design-analysis",
        extraction: {
          elements: data.elements || [],
          globalTokens: data.globalTokens || { colors: {}, fonts: {}, shadows: [], gradients: [] },
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: data.metadata?.sourceWidth || 1920,
          sourceHeight: data.metadata?.sourceHeight || 1080,
          totalElements: data.metadata?.elementCount || 0,
        },
      };

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate blueprint");
      const promptData = await promptResponse.json();
      setGeneratedPrompt(promptData);
      setProgress(100);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("idle");
      setProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".psd")) {
      setPsdFile(file);
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Back to Home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <Image
                src="/logo.png"
                alt="Designer Logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg object-contain shadow-sm"
                priority
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tracking-tight">Designer</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">by Lavaithan</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {figmaConnected && (
              <Button variant="ghost" size="sm" onClick={disconnectFigma}>
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect Figma
              </Button>
            )}
            {step === "complete" && (
              <Button variant="outline" size="sm" onClick={resetState}>
                New Analysis
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Input Source</CardTitle>
                <CardDescription>
                  Choose a design source to analyze and convert into IDE prompts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={source === "git" ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setSource("git")}
                    disabled={isProcessing}
                  >
                    <GitBranch className="h-5 w-5" />
                    Git Repo
                  </Button>
                  <Button
                    variant={source === "figma" ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setSource("figma")}
                    disabled={isProcessing}
                  >
                    <PenTool className="h-5 w-5" />
                    Figma
                  </Button>
                  <Button
                    variant={source === "psd" ? "default" : "outline"}
                    className="h-20 flex-col gap-2"
                    onClick={() => setSource("psd")}
                    disabled={isProcessing}
                  >
                    <FileImage className="h-5 w-5" />
                    PSD / Image
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
                  <CardTitle>Figma Design</CardTitle>
                  <CardDescription>
                    Connect your Figma account via OAuth 2.0 to import designs directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!figmaChecking && (
                    <>
                      {figmaConnected ? (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              Figma account connected (OAuth 2.0)
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={disconnectFigma}>
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={connectFigma}
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Connect with Figma (OAuth 2.0)
                        </Button>
                      )}
                    </>
                  )}
                  {figmaChecking && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking Figma connection...
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Figma File URL</label>
                    <Input
                      placeholder="https://www.figma.com/file/xxxxx/Design or https://www.figma.com/design/xxxxx"
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>

                  {!figmaConnected && (
                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-sm font-medium">
                        Personal Access Token <span className="text-muted-foreground text-xs">(optional alternative to OAuth)</span>
                      </label>
                      <Input
                        type="password"
                        placeholder="figd_xxxxxxxxxxxxxxxx"
                        value={figmaPat}
                        onChange={(e) => setFigmaPat(e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleFigmaAnalyze}
                    disabled={!figmaUrl || isProcessing || (!figmaConnected && !figmaPat)}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <PenTool className="h-4 w-4 mr-2" />
                        Analyze Figma File
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {source === "psd" && (
              <Card>
                <CardHeader>
                  <CardTitle>PSD / Image Upload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="image">
                    <TabsList className="w-full">
                      <TabsTrigger value="image" className="flex-1">
                        Image File
                      </TabsTrigger>
                      <TabsTrigger value="psd" className="flex-1">
                        PSD File
                      </TabsTrigger>
                      <TabsTrigger value="url" className="flex-1">
                        Image URL
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="image" className="space-y-4">
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {imageFile ? imageFile.name : "Click to upload image from your device"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WebP, GIF
                        </p>
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </TabsContent>
                    <TabsContent value="psd" className="space-y-4">
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {psdFile ? psdFile.name : "Click to upload PSD file"}
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".psd"
                        className="hidden"
                        onChange={handleFileUpload}
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
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (psdFile) {
                        handlePsdAnalyze();
                      } else if (imageFile) {
                        handleVisionAnalyze();
                      }
                    }}
                    disabled={(!psdFile && !imageFile) || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Analyze Design
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isProcessing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {step === "extracting" && "Extracting spatial data with Gemini 2.5 Flash..."}
                        {step === "generating" && "Compiling pixel-accurate blueprint..."}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
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
                    <CardTitle className="flex items-center justify-between">
                      Generated Blueprint
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedPrompt.fullBlueprint)}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(generatedPrompt.fullBlueprint, "designer-blueprint.md")
                          }
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {generatedPrompt.chunks.length} chunks &bull; ~
                      {generatedPrompt.chunks.reduce((s, c) => s + c.tokenEstimate, 0)} tokens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="viewport">
                      <TabsList>
                        <TabsTrigger value="viewport" className="gap-1">
                          <Code2 className="h-3 w-3" />
                          Viewport
                        </TabsTrigger>
                        <TabsTrigger value="spatial" className="gap-1">
                          <Eye className="h-3 w-3" />
                          Spatial
                        </TabsTrigger>
                        <TabsTrigger value="effects" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Effects
                        </TabsTrigger>
                        <TabsTrigger value="responsive" className="gap-1">
                          <FileText className="h-3 w-3" />
                          Responsive
                        </TabsTrigger>
                        <TabsTrigger value="code" className="gap-1">
                          <Code2 className="h-3 w-3" />
                          Code
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="viewport">
                        <Textarea
                          readOnly
                          className="min-h-100 font-mono text-xs"
                          value={generatedPrompt.viewportSetup}
                        />
                      </TabsContent>
                      <TabsContent value="spatial">
                        <Textarea
                          readOnly
                          className="min-h-100 font-mono text-xs"
                          value={generatedPrompt.spatialMatrix}
                        />
                      </TabsContent>
                      <TabsContent value="effects">
                        <Textarea
                          readOnly
                          className="min-h-100 font-mono text-xs"
                          value={generatedPrompt.microEffects}
                        />
                      </TabsContent>
                      <TabsContent value="responsive">
                        <Textarea
                          readOnly
                          className="min-h-100 font-mono text-xs"
                          value={generatedPrompt.responsiveRules}
                        />
                      </TabsContent>
                      <TabsContent value="code">
                        <div className="space-y-2">
                          <Textarea
                            readOnly
                            className="min-h-75 font-mono text-xs"
                            value={generatedPrompt.codeGenerationSteps}
                          />
                          <Button
                            variant="outline"
                            className="w-full"
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
                    <CardTitle>Extracted Elements</CardTitle>
                    <CardDescription>
                      {specDocument?.metadata.totalElements} elements detected
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-75 overflow-y-auto">
                      {specDocument?.extraction.elements.map((el) => (
                        <div
                          key={el.id}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{el.semanticTag}</Badge>
                            <span className="text-sm">{el.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
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
