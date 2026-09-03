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
import type { SpecDocument, GeneratedPrompt } from "@/lib/types/spec-dsl";

type InputSource = "git" | "figma" | "psd" | null;
type ProcessingStep = "idle" | "extracting" | "analyzing" | "generating" | "complete";

export default function DashboardPage() {
  const [source, setSource] = useState<InputSource>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [psdFile, setPsdFile] = useState<File | null>(null);
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
    window.location.href = "/api/figma/authorize?redirect_to=/dashboard?figma_connected=1";
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
    setPsdFile(null);
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
        designTokens: {
          colors: {
            primary: "#3b82f6",
            secondary: "#6b7280",
            accent: "#8b5cf6",
            background: "#ffffff",
            foreground: "#171717",
            muted: "#a3a3a3",
            border: "#e5e7eb",
            destructive: "#ef4444",
          },
          typography: {
            fontFamily: "Inter, sans-serif",
            sizes: { sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30 },
            weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
            lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
          },
          spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
          radii: { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, "2xl": 16, full: 9999 },
        },
        components: data.componentSignatures.map((sig: { name: string; path: string; props: string[] }) => ({
          id: sig.path,
          name: sig.name,
          category: "Unknown" as const,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          spatialDistances: { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 },
          layout: { type: "flex" as const, gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
          styles: { colors: {}, radius: 0 },
          children: [],
          componentName: sig.name,
        })),
        fileTree: data.fileTree,
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: 0,
          sourceHeight: 0,
          totalComponents: data.componentSignatures.length,
        },
      };

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate prompt");
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
        body: JSON.stringify({ fileUrl: figmaUrl }),
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

      const doc: SpecDocument = {
        source: "figma",
        sourceUrl: figmaUrl,
        projectName: data.metadata.fileName || "figma-design",
        designTokens: data.designTokens,
        components: data.components,
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: data.metadata.width,
          sourceHeight: data.metadata.height,
          totalComponents: data.metadata.totalComponents,
        },
      };

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate prompt");
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
        designTokens: {
          colors: {
            primary: "#3b82f6",
            secondary: "#6b7280",
            accent: "#8b5cf6",
            background: "#ffffff",
            foreground: "#171717",
            muted: "#a3a3a3",
            border: "#e5e7eb",
            destructive: "#ef4444",
          },
          typography: {
            fontFamily: "Inter, sans-serif",
            sizes: { sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30 },
            weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
            lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
          },
          spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
          radii: { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, "2xl": 16, full: 9999 },
        },
        components: data.components,
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: data.metadata.width,
          sourceHeight: data.metadata.height,
          totalComponents: data.metadata.totalComponents,
        },
      };

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate prompt");
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
    if (!imageUrl) return;
    setStep("extracting");
    setProgress(20);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("imageUrl", imageUrl);

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
        sourceUrl: imageUrl,
        projectName: "design-analysis",
        designTokens: {
          colors: {
            primary: data.designTokens?.colors?.[0] || "#3b82f6",
            secondary: data.designTokens?.colors?.[1] || "#6b7280",
            accent: data.designTokens?.colors?.[2] || "#8b5cf6",
            background: "#ffffff",
            foreground: "#171717",
            muted: "#a3a3a3",
            border: "#e5e7eb",
            destructive: "#ef4444",
          },
          typography: {
            fontFamily: data.designTokens?.fonts?.[0]?.family || "Inter, sans-serif",
            sizes: { sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30 },
            weights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
            lineHeights: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
          },
          spacing: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
          radii: { none: 0, sm: 2, DEFAULT: 4, md: 6, lg: 8, xl: 12, "2xl": 16, full: 9999 },
        },
        components: data.detections.map((d: { label: string; category: string; bbox: [number, number, number, number]; confidence: number; styles?: Record<string, unknown>; text?: string }) => ({
          id: Math.random().toString(36).substring(7),
          name: d.label,
          category: d.category || "Unknown",
          boundingBox: { x: d.bbox[0], y: d.bbox[1], width: d.bbox[2] - d.bbox[0], height: d.bbox[3] - d.bbox[1] },
          spatialDistances: { marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0 },
          layout: { type: "flex" as const, gap: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 } },
          styles: { colors: d.styles?.backgroundColor ? { background: d.styles.backgroundColor as string } : {}, radius: (d.styles?.borderRadius as number) || 0 },
          children: [],
          textContent: d.text,
          componentName: d.label.replace(/\s+/g, ""),
        })),
        metadata: {
          extractedAt: new Date().toISOString(),
          sourceWidth: 0,
          sourceHeight: 0,
          totalComponents: data.detections.length,
        },
      };

      setSpecDocument(doc);
      setProgress(70);

      const promptResponse = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specDocument: doc }),
      });

      if (!promptResponse.ok) throw new Error("Failed to generate prompt");
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
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Designer by Lavaithan</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {figmaConnected && (
              <Button variant="ghost" size="sm" onClick={disconnectFigma}>
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect Figma
              </Button>
            )}
            {step === "complete" && (
              <Button variant="outline" onClick={resetState}>
                New Analysis
              </Button>
            )}
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
                    Connect your Figma account to import designs directly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!figmaChecking && (
                    <>
                      {figmaConnected ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">
                            Figma account connected
                          </span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={connectFigma}
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Connect Figma Account
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
                      placeholder="https://www.figma.com/file/xxxxx/Design"
                      value={figmaUrl}
                      onChange={(e) => setFigmaUrl(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleFigmaAnalyze}
                    disabled={!figmaUrl || isProcessing || !figmaConnected}
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
                  <Tabs defaultValue="psd">
                    <TabsList className="w-full">
                      <TabsTrigger value="psd" className="flex-1">
                        PSD File
                      </TabsTrigger>
                      <TabsTrigger value="image" className="flex-1">
                        Image URL
                      </TabsTrigger>
                    </TabsList>
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
                    <TabsContent value="image" className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Image URL</label>
                        <Input
                          placeholder="https://example.com/design.png"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="text-center text-sm text-muted-foreground">or</div>
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                      </div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </TabsContent>
                  </Tabs>
                  <Button
                    className="w-full"
                    onClick={source === "psd" && psdFile ? handlePsdAnalyze : handleVisionAnalyze}
                    disabled={(!psdFile && !imageUrl) || isProcessing}
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
                        {step === "extracting" && "Extracting design data..."}
                        {step === "analyzing" && "Analyzing components..."}
                        {step === "generating" && "Generating prompts..."}
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
                      Generated Prompt
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedPrompt.systemPrompt)}
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
                            downloadFile(generatedPrompt.fullMarkdown, "designer-prompt.md")
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
                    <Tabs defaultValue="system">
                      <TabsList>
                        <TabsTrigger value="system" className="gap-1">
                          <Code2 className="h-3 w-3" />
                          System Prompt
                        </TabsTrigger>
                        <TabsTrigger value="design" className="gap-1">
                          <Eye className="h-3 w-3" />
                          Design Tokens
                        </TabsTrigger>
                        <TabsTrigger value="components" className="gap-1">
                          <FileText className="h-3 w-3" />
                          Components
                        </TabsTrigger>
                        <TabsTrigger value="cursor" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Cursor Rules
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="system">
                        <Textarea
                          readOnly
                          className="min-h-[400px] font-mono text-xs"
                          value={generatedPrompt.systemPrompt}
                        />
                      </TabsContent>
                      <TabsContent value="design">
                        <Textarea
                          readOnly
                          className="min-h-[400px] font-mono text-xs"
                          value={generatedPrompt.designTokensMarkdown}
                        />
                      </TabsContent>
                      <TabsContent value="components">
                        <Textarea
                          readOnly
                          className="min-h-[400px] font-mono text-xs"
                          value={generatedPrompt.componentGuide}
                        />
                      </TabsContent>
                      <TabsContent value="cursor">
                        <div className="space-y-2">
                          <Textarea
                            readOnly
                            className="min-h-[300px] font-mono text-xs"
                            value={generatedPrompt.cursorRules}
                          />
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              downloadFile(generatedPrompt.cursorRules, ".cursorrules")
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download .cursorrules
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Spec Document Preview</CardTitle>
                    <CardDescription>
                      {specDocument?.metadata.totalComponents} components extracted
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {specDocument?.components.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{comp.category}</Badge>
                            <span className="text-sm">{comp.componentName || comp.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {comp.boundingBox.width}x{comp.boundingBox.height}
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
                      Select an input source and provide your design to get
                      started.
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
