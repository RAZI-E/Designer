"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  PenTool,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
  RefreshCw,
  LogOut,
  FolderPlus,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface FigmaProjectItem {
  id: string;
  name: string;
  url: string;
  fileKey: string;
  thumbnailUrl?: string;
  lastModified?: string;
  projectName?: string;
  isRecent?: boolean;
}

interface FigmaUserData {
  id: string;
  email: string;
  handle: string;
  img_url?: string;
}

interface FigmaProjectSelectorProps {
  onSelectProject: (url: string, name: string) => Promise<void> | void;
  onDisconnect: () => void;
  isProcessing: boolean;
  activeProcessingUrl?: string;
}

const LOCAL_STORAGE_RECENTS_KEY = "ep_recent_figma_projects";

export function FigmaProjectSelector({
  onSelectProject,
  onDisconnect,
  isProcessing,
  activeProcessingUrl,
}: FigmaProjectSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [userData, setUserData] = useState<FigmaUserData | null>(null);
  const [remoteFiles, setRemoteFiles] = useState<FigmaProjectItem[]>([]);
  const [recentProjects, setRecentProjects] = useState<FigmaProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"all" | "recents" | "add">("all");
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  // Load recents from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_RECENTS_KEY);
      if (stored) {
        setRecentProjects(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load recent Figma projects:", e);
    }
  }, []);

  // Fetch user data & remote team files
  const fetchFigmaData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/figma/projects");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserData(data.user);
        }
        if (data.files && Array.isArray(data.files)) {
          const mapped: FigmaProjectItem[] = data.files.map((f: any) => ({
            id: f.key,
            name: f.name || "Untitled File",
            url: `https://www.figma.com/design/${f.key}`,
            fileKey: f.key,
            thumbnailUrl: f.thumbnail_url,
            lastModified: f.last_modified,
            projectName: f.project_name || "Team Project",
          }));
          setRemoteFiles(mapped);
        }
      }
    } catch (err) {
      console.warn("Error fetching Figma data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFigmaData();
  }, []);

  // Save to recents helper
  const saveToRecents = (item: FigmaProjectItem) => {
    try {
      const updated = [
        item,
        ...recentProjects.filter((p) => p.fileKey !== item.fileKey),
      ].slice(0, 15);
      setRecentProjects(updated);
      localStorage.setItem(LOCAL_STORAGE_RECENTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save recent project:", e);
    }
  };

  const removeRecent = (fileKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentProjects.filter((p) => p.fileKey !== fileKey);
    setRecentProjects(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_RECENTS_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Combine remote and recent projects (removing duplicates)
  const combinedProjects = useMemo(() => {
    const map = new Map<string, FigmaProjectItem>();

    // Add recents first
    for (const p of recentProjects) {
      map.set(p.fileKey, { ...p, isRecent: true });
    }

    // Add remote files
    for (const r of remoteFiles) {
      if (!map.has(r.fileKey)) {
        map.set(r.fileKey, r);
      }
    }

    return Array.from(map.values());
  }, [recentProjects, remoteFiles]);

  // Filtered items based on tab & search
  const filteredProjects = useMemo(() => {
    const list = selectedTab === "recents" ? recentProjects : combinedProjects;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.projectName && p.projectName.toLowerCase().includes(q)) ||
        p.fileKey.toLowerCase().includes(q)
    );
  }, [combinedProjects, recentProjects, selectedTab, searchQuery]);

  const handleSelect = async (item: FigmaProjectItem) => {
    setImportingUrl(item.url);
    saveToRecents(item);
    try {
      await onSelectProject(item.url, item.name);
    } finally {
      setImportingUrl(null);
    }
  };

  const handleCustomImport = async () => {
    if (!customUrl.trim()) return;
    const match = customUrl.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
    const fileKey = match ? match[1] : `manual-${Date.now()}`;
    const nameMatch = customUrl.match(/figma\.com\/(?:design|file)\/[a-zA-Z0-9]+\/([^?#]+)/);
    const decodedName = nameMatch
      ? decodeURIComponent(nameMatch[1].replace(/-/g, " "))
      : `Figma File (${fileKey.slice(0, 6)})`;

    const item: FigmaProjectItem = {
      id: fileKey,
      fileKey,
      name: decodedName,
      url: customUrl.trim(),
      projectName: "Imported from URL",
      lastModified: new Date().toISOString(),
      isRecent: true,
    };

    setImportingUrl(item.url);
    saveToRecents(item);
    try {
      await onSelectProject(item.url, item.name);
      setCustomUrl("");
    } finally {
      setImportingUrl(null);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="space-y-4">
      {/* Vercel-Style Account Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center gap-3">
          {userData?.img_url ? (
            <img
              src={userData.img_url}
              alt={userData.handle}
              className="w-9 h-9 rounded-full ring-2 ring-border object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-linear-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-medium text-sm shadow-inner">
              {userData?.handle?.charAt(0).toUpperCase() || "F"}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                {userData?.handle || "Figma Account"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-55 sm:max-w-xs">
              {userData?.email || "Ready to import projects into prompt"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFigmaData}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Refresh projects"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Vercel Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/50 text-xs">
          <button
            type="button"
            onClick={() => setSelectedTab("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              selectedTab === "all"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Projects ({combinedProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("recents")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              selectedTab === "recents"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recent ({recentProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("add")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
              selectedTab === "add"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderPlus className="h-3 w-3" />
            Paste URL
          </button>
        </div>

        {selectedTab !== "add" && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>
        )}
      </div>

      {/* Tab: Paste URL directly */}
      {selectedTab === "add" && (
        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-3">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <PenTool className="h-3.5 w-3.5 text-indigo-500" />
              Import Any Figma File
            </h4>
            <p className="text-xs text-muted-foreground">
              Paste any Figma design link (e.g. from your drafts, community, or teams). It will be analyzed and saved to your project list.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="https://www.figma.com/design/xxxxxx/My-Project or file/..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="h-9 text-xs font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && customUrl.trim()) handleCustomImport();
              }}
            />
            <Button
              size="sm"
              onClick={handleCustomImport}
              disabled={!customUrl.trim() || isProcessing}
              className="h-9 px-4 shrink-0 text-xs font-medium"
            >
              {isProcessing && importingUrl === customUrl ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Import to Prompt
            </Button>
          </div>
        </div>
      )}

      {/* Projects List / Grid */}
      {selectedTab !== "add" && (
        <div className="space-y-2">
          {filteredProjects.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Layers className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? "No matching Figma projects found" : "No projects in list yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? "Try a different search term or paste the Figma file URL directly."
                    : "Paste any Figma file URL below to analyze it and convert into prompt for your IDE."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTab("add")}
                className="text-xs"
              >
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                Paste Figma File URL
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredProjects.map((project) => {
                const isCurrentlyImporting =
                  isProcessing &&
                  (importingUrl === project.url || activeProcessingUrl === project.url);

                return (
                  <div
                    key={project.fileKey}
                    onClick={() => !isProcessing && handleSelect(project)}
                    className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isCurrentlyImporting
                        ? "bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20"
                        : "bg-card/90 border-border/70 hover:border-foreground/20 hover:bg-muted/30 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      {/* Thumbnail or Icon */}
                      <div className="w-12 h-12 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {project.thumbnailUrl ? (
                          <img
                            src={project.thumbnailUrl}
                            alt={project.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
                            <PenTool className="h-5 w-5 text-indigo-500/70" />
                          </div>
                        )}
                      </div>

                      {/* Project Meta */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-indigo-500 transition-colors">
                            {project.name}
                          </h4>
                          {project.isRecent && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 font-normal"
                            >
                              Recent
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {project.projectName && (
                            <span className="truncate max-w-35">
                              {project.projectName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(project.lastModified)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {project.isRecent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => removeRecent(project.fileKey, e)}
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove from recents"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <a
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        title="Open in Figma"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      <Button
                        size="sm"
                        disabled={isProcessing}
                        className={`h-8 px-3 text-xs font-medium transition-all ${
                          isCurrentlyImporting
                            ? "bg-indigo-600 text-white"
                            : "bg-foreground text-background hover:bg-foreground/90"
                        }`}
                      >
                        {isCurrentlyImporting ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Converting...
                          </>
                        ) : (
                          <>
                            Import
                            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
