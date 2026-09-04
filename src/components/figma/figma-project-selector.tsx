"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  FolderSync,
  HelpCircle,
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
const LOCAL_STORAGE_TEAMS_KEY = "ep_figma_team_ids";
const LOCAL_STORAGE_SAVED_FILES_KEY = "ep_figma_saved_files";

export function FigmaProjectSelector({
  onSelectProject,
  onDisconnect,
  isProcessing,
  activeProcessingUrl,
}: FigmaProjectSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [syncInput, setSyncInput] = useState("");
  const [userData, setUserData] = useState<FigmaUserData | null>(null);
  const [remoteFiles, setRemoteFiles] = useState<FigmaProjectItem[]>([]);
  const [recentProjects, setRecentProjects] = useState<FigmaProjectItem[]>([]);
  const [savedFiles, setSavedFiles] = useState<FigmaProjectItem[]>([]);
  const [savedTeamIds, setSavedTeamIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "recents" | "add">("all");
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [showTeamHelp, setShowTeamHelp] = useState(false);

  // Load saved local data
  useEffect(() => {
    try {
      const storedRecents = localStorage.getItem(LOCAL_STORAGE_RECENTS_KEY);
      if (storedRecents) setRecentProjects(JSON.parse(storedRecents));

      const storedTeams = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      if (storedTeams) setSavedTeamIds(JSON.parse(storedTeams));

      const storedFiles = localStorage.getItem(LOCAL_STORAGE_SAVED_FILES_KEY);
      if (storedFiles) setSavedFiles(JSON.parse(storedFiles));
    } catch (e) {
      console.warn("Could not load stored Figma data:", e);
    }
  }, []);

  // Fetch projects from server
  const fetchFigmaData = useCallback(async () => {
    setIsLoading(true);
    setSyncError(null);
    try {
      // Gather known team IDs and file keys from storage
      let teamsToQuery: string[] = [];
      let filesToQuery: string[] = [];
      try {
        const storedTeams = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
        if (storedTeams) teamsToQuery = JSON.parse(storedTeams);

        const storedFiles = localStorage.getItem(LOCAL_STORAGE_SAVED_FILES_KEY);
        if (storedFiles) {
          const parsed: FigmaProjectItem[] = JSON.parse(storedFiles);
          filesToQuery = parsed.map((p) => p.fileKey);
        }

        const storedRecents = localStorage.getItem(LOCAL_STORAGE_RECENTS_KEY);
        if (storedRecents) {
          const parsedRecents: FigmaProjectItem[] = JSON.parse(storedRecents);
          filesToQuery = Array.from(new Set([...filesToQuery, ...parsedRecents.map((r) => r.fileKey)]));
        }
      } catch {}

      const params = new URLSearchParams();
      if (teamsToQuery.length > 0) params.set("team_ids", teamsToQuery.join(","));
      if (filesToQuery.length > 0) params.set("file_keys", filesToQuery.slice(0, 20).join(","));

      const res = await fetch(`/api/figma/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserData(data.user);
        }
        if (data.files && Array.isArray(data.files)) {
          const mapped: FigmaProjectItem[] = data.files.map((f: any) => ({
            id: f.key,
            name: f.name || "Untitled File",
            url: f.url || `https://www.figma.com/design/${f.key}`,
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
  }, []);

  useEffect(() => {
    fetchFigmaData();
  }, [fetchFigmaData]);

  // Sync new Team / Project / File URL
  const handleSyncUrl = async () => {
    if (!syncInput.trim()) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch("/api/figma/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [syncInput.trim()] }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to load projects from Figma");
      }

      const data = await res.json();
      if (data.user) setUserData(data.user);

      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        const newMapped: FigmaProjectItem[] = data.files.map((f: any) => ({
          id: f.key,
          name: f.name || "Figma File",
          url: f.url || `https://www.figma.com/design/${f.key}`,
          fileKey: f.key,
          thumbnailUrl: f.thumbnail_url,
          lastModified: f.last_modified,
          projectName: f.project_name || "Figma Project",
        }));

        // Merge into remote files and saved files
        setRemoteFiles((prev) => {
          const map = new Map(prev.map((p) => [p.fileKey, p]));
          for (const item of newMapped) map.set(item.fileKey, item);
          return Array.from(map.values());
        });

        setSavedFiles((prev) => {
          const map = new Map(prev.map((p) => [p.fileKey, p]));
          for (const item of newMapped) map.set(item.fileKey, item);
          const updated = Array.from(map.values()).slice(0, 50);
          localStorage.setItem(LOCAL_STORAGE_SAVED_FILES_KEY, JSON.stringify(updated));
          return updated;
        });

        // If team was discovered, save team ID
        if (data.teams && Array.isArray(data.teams)) {
          const newTeamIds = data.teams.map((t: any) => String(t.id));
          setSavedTeamIds((prev) => {
            const merged = Array.from(new Set([...prev, ...newTeamIds]));
            localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(merged));
            return merged;
          });
        }

        setSyncInput("");
        setSelectedTab("all");
      } else {
        // Fallback: If URL is a direct file design link, parse key and add directly
        const fileMatch = syncInput.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/i);
        if (fileMatch) {
          const key = fileMatch[1];
          const nameMatch = syncInput.match(/figma\.com\/(?:design|file)\/[a-zA-Z0-9]+\/([^?#]+)/i);
          const decodedName = nameMatch
            ? decodeURIComponent(nameMatch[1].replace(/-/g, " "))
            : `Figma Design (${key.slice(0, 6)})`;

          const fallbackItem: FigmaProjectItem = {
            id: key,
            fileKey: key,
            name: decodedName,
            url: syncInput.trim(),
            projectName: "Direct File",
            lastModified: new Date().toISOString(),
            isRecent: true,
          };

          setSavedFiles((prev) => {
            const updated = [fallbackItem, ...prev.filter((p) => p.fileKey !== key)].slice(0, 50);
            localStorage.setItem(LOCAL_STORAGE_SAVED_FILES_KEY, JSON.stringify(updated));
            return updated;
          });

          setSyncInput("");
          setSelectedTab("all");
        } else {
          setSyncError("No accessible projects found. Ensure your team or file link is valid and shared with your account.");
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Failed to sync project");
    } finally {
      setIsSyncing(false);
    }
  };

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

  const removeProject = (fileKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedRecents = recentProjects.filter((p) => p.fileKey !== fileKey);
    setRecentProjects(updatedRecents);
    const updatedSaved = savedFiles.filter((p) => p.fileKey !== fileKey);
    setSavedFiles(updatedSaved);
    setRemoteFiles((prev) => prev.filter((p) => p.fileKey !== fileKey));
    try {
      localStorage.setItem(LOCAL_STORAGE_RECENTS_KEY, JSON.stringify(updatedRecents));
      localStorage.setItem(LOCAL_STORAGE_SAVED_FILES_KEY, JSON.stringify(updatedSaved));
    } catch {}
  };

  // Combine remote, saved, and recent projects
  const combinedProjects = useMemo(() => {
    const map = new Map<string, FigmaProjectItem>();

    // Add remote files first
    for (const r of remoteFiles) {
      map.set(r.fileKey, r);
    }

    // Add saved files
    for (const s of savedFiles) {
      if (!map.has(s.fileKey)) {
        map.set(s.fileKey, s);
      }
    }

    // Mark recents
    for (const p of recentProjects) {
      const existing = map.get(p.fileKey);
      if (existing) {
        map.set(p.fileKey, { ...existing, isRecent: true });
      } else {
        map.set(p.fileKey, { ...p, isRecent: true });
      }
    }

    return Array.from(map.values());
  }, [remoteFiles, savedFiles, recentProjects]);

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
      {/* Account Profile Header */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3">
          {userData?.img_url ? (
            <img
              src={userData.img_url}
              alt={userData.handle}
              className="w-9 h-9 rounded-full ring-2 ring-border object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {userData?.handle?.charAt(0).toUpperCase() || "F"}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-foreground">
                {userData?.handle || "Figma Workspace"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-55 sm:max-w-xs">
              {userData?.email || "Select a project to generate blueprint prompts"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFigmaData}
            disabled={isLoading || isSyncing}
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

      {/* Sync Projects / Add Team Bar */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FolderSync className="h-3.5 w-3.5 text-primary" />
            Add Team or File Link
          </label>
          <button
            type="button"
            onClick={() => setShowTeamHelp(!showTeamHelp)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <HelpCircle className="h-3 w-3" />
            Help
          </button>
        </div>

        {showTeamHelp && (
          <div className="p-2.5 rounded-lg bg-background/60 border text-[11px] text-muted-foreground space-y-1 leading-relaxed">
            <p className="text-foreground font-medium">Supported links:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>Team:</strong> <code className="text-foreground">figma.com/files/team/123456...</code>
              </li>
              <li>
                <strong>File:</strong> <code className="text-foreground">figma.com/design/XXXXX/...</code>
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="figma.com/design/... or team link"
            value={syncInput}
            onChange={(e) => setSyncInput(e.target.value)}
            className="h-9 text-xs font-mono"
            disabled={isSyncing || isProcessing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && syncInput.trim()) handleSyncUrl();
            }}
          />
          <Button
            size="sm"
            onClick={handleSyncUrl}
            disabled={!syncInput.trim() || isSyncing || isProcessing}
            className="h-9 px-3.5 shrink-0 text-xs font-medium"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Syncing...
              </>
            ) : (
              <>
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                Add & Sync
              </>
            )}
          </Button>
        </div>

        {syncError && (
          <p className="text-xs text-destructive">{syncError}</p>
        )}
      </div>

      {/* Navigation & Search Filter */}
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
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/80"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-2">
        {isLoading && combinedProjects.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-2">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Loading Figma projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-border/70 text-center bg-muted/10 space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Layers className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? "No matching projects found" : "No Figma projects loaded yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Paste your Figma Team link or design file URL in the sync box above to load your projects.
              </p>
            </div>
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
                      ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                      : "bg-card border-border hover:border-primary/40 hover:bg-muted/30 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <PenTool className="h-5 w-5 text-primary/70" />
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
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
                          <span className="truncate max-w-35 font-medium">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => removeProject(project.fileKey, e)}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Remove from list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

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
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/90 text-primary-foreground hover:bg-primary"
                      }`}
                    >
                      {isCurrentlyImporting ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          Make Prompt
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
    </div>
  );
}
