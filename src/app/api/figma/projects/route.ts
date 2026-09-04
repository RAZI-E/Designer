import { NextRequest, NextResponse } from "next/server";
import { getValidFigmaToken } from "@/lib/figma/oauth";

export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url?: string;
}

export interface FigmaProjectFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  project_name?: string;
  project_id?: string;
  url: string;
}

function extractFigmaIdentifiers(urlOrId: string): {
  type: "team" | "project" | "file" | "unknown";
  id: string;
} {
  const str = urlOrId.trim();

  // Team URL: figma.com/files/team/123456... or /team/123456
  const teamMatch = str.match(/figma\.com\/(?:files\/)?team\/([0-9]+)/i);
  if (teamMatch) return { type: "team", id: teamMatch[1] };

  // Project URL: figma.com/files/project/123456...
  const projectMatch = str.match(/figma\.com\/files\/project\/([0-9]+)/i);
  if (projectMatch) return { type: "project", id: projectMatch[1] };

  // File / Design URL: figma.com/file/KEY/... or figma.com/design/KEY/...
  const fileMatch = str.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/i);
  if (fileMatch) return { type: "file", id: fileMatch[1] };

  // Pure numeric string -> team or project ID
  if (/^[0-9]+$/.test(str)) {
    return { type: "team", id: str };
  }

  // Alphanumeric ~22 chars -> file key
  if (/^[a-zA-Z0-9_-]{10,40}$/.test(str)) {
    return { type: "file", id: str };
  }

  return { type: "unknown", id: str };
}

async function resolveToken(request: NextRequest): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie");
  const authHeader = request.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  } else if (authHeader && authHeader.startsWith("figd_")) {
    return authHeader.trim();
  }

  try {
    return await getValidFigmaToken(cookieHeader);
  } catch {
    return null;
  }
}

async function fetchFigmaUser(headers: Record<string, string>): Promise<FigmaUser | null> {
  try {
    const res = await fetch("https://api.figma.com/v1/me", { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id || "",
        email: data.email || "",
        handle: data.handle || data.name || "Figma User",
        img_url: data.img_url || "",
      };
    }
  } catch (e) {
    console.warn("Could not fetch Figma /v1/me:", e);
  }
  return null;
}

async function fetchTeamProjectsAndFiles(
  teamId: string,
  headers: Record<string, string>,
  collectedFiles: Map<string, FigmaProjectFile>,
  teams: { id: string; name: string }[]
) {
  try {
    const teamRes = await fetch(`https://api.figma.com/v1/teams/${teamId}/projects`, { headers });
    if (teamRes.ok) {
      const teamData = await teamRes.json();
      teams.push({ id: teamId, name: teamData.name || `Team ${teamId}` });

      for (const proj of teamData.projects || []) {
        try {
          const filesRes = await fetch(`https://api.figma.com/v1/projects/${proj.id}/files`, { headers });
          if (filesRes.ok) {
            const filesData = await filesRes.json();
            for (const f of filesData.files || []) {
              collectedFiles.set(f.key, {
                key: f.key,
                name: f.name || "Untitled Project",
                thumbnail_url: f.thumbnail_url,
                last_modified: f.last_modified,
                project_name: proj.name || "Team Project",
                project_id: proj.id,
                url: `https://www.figma.com/design/${f.key}`,
              });
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch files for project ${proj.id}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch team ${teamId}:`, err);
  }
}

async function fetchSingleFileMeta(
  fileKey: string,
  headers: Record<string, string>
): Promise<FigmaProjectFile | null> {
  try {
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        key: fileKey,
        name: data.name || "Figma Design",
        thumbnail_url: data.thumbnailUrl,
        last_modified: data.lastModified || new Date().toISOString(),
        project_name: "Workspace File",
        url: `https://www.figma.com/design/${fileKey}`,
      };
    }
  } catch (e) {
    console.warn(`Failed to fetch meta for file ${fileKey}:`, e);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = await resolveToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Figma", authenticated: false },
        { status: 401 }
      );
    }

    const isPat = accessToken.startsWith("figd_");
    const headers: Record<string, string> = isPat
      ? { "X-Figma-Token": accessToken }
      : { Authorization: `Bearer ${accessToken}` };

    const user = await fetchFigmaUser(headers);

    const collectedFiles = new Map<string, FigmaProjectFile>();
    const teams: { id: string; name: string }[] = [];

    const searchParams = request.nextUrl.searchParams;
    const rawTeamIds = searchParams.get("team_ids") || searchParams.get("team_id") || "";
    const rawFileKeys = searchParams.get("file_keys") || searchParams.get("file_key") || "";

    const teamIds = rawTeamIds ? rawTeamIds.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const fileKeys = rawFileKeys ? rawFileKeys.split(",").map((s) => s.trim()).filter(Boolean) : [];

    // Query teams
    for (const teamId of teamIds) {
      await fetchTeamProjectsAndFiles(teamId, headers, collectedFiles, teams);
    }

    // Query individual file keys
    for (const key of fileKeys) {
      if (!collectedFiles.has(key)) {
        const fileMeta = await fetchSingleFileMeta(key, headers);
        if (fileMeta) collectedFiles.set(key, fileMeta);
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      teams,
      files: Array.from(collectedFiles.values()),
    });
  } catch (error) {
    console.error("Error in GET /api/figma/projects:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Figma projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = await resolveToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated with Figma", authenticated: false },
        { status: 401 }
      );
    }

    const isPat = accessToken.startsWith("figd_");
    const headers: Record<string, string> = isPat
      ? { "X-Figma-Token": accessToken }
      : { Authorization: `Bearer ${accessToken}` };

    const body = await request.json().catch(() => ({}));
    const { teamIds = [], projectIds = [], fileKeys = [], urls = [] } = body;

    const collectedFiles = new Map<string, FigmaProjectFile>();
    const teams: { id: string; name: string }[] = [];

    const allTeamIds = new Set<string>(teamIds);
    const allProjectIds = new Set<string>(projectIds);
    const allFileKeys = new Set<string>(fileKeys);

    // Parse input URLs
    for (const u of urls) {
      const parsed = extractFigmaIdentifiers(u);
      if (parsed.type === "team") allTeamIds.add(parsed.id);
      if (parsed.type === "project") allProjectIds.add(parsed.id);
      if (parsed.type === "file") allFileKeys.add(parsed.id);
    }

    // Fetch team projects & files
    for (const teamId of allTeamIds) {
      await fetchTeamProjectsAndFiles(teamId, headers, collectedFiles, teams);
    }

    // Fetch direct project files
    for (const projId of allProjectIds) {
      try {
        const filesRes = await fetch(`https://api.figma.com/v1/projects/${projId}/files`, { headers });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          for (const f of filesData.files || []) {
            collectedFiles.set(f.key, {
              key: f.key,
              name: f.name || "Project File",
              thumbnail_url: f.thumbnail_url,
              last_modified: f.last_modified,
              project_id: projId,
              project_name: "Project Files",
              url: `https://www.figma.com/design/${f.key}`,
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch project files for ${projId}:`, e);
      }
    }

    // Fetch individual file keys
    for (const key of allFileKeys) {
      if (!collectedFiles.has(key)) {
        const fileMeta = await fetchSingleFileMeta(key, headers);
        if (fileMeta) collectedFiles.set(key, fileMeta);
      }
    }

    const user = await fetchFigmaUser(headers);

    return NextResponse.json({
      authenticated: true,
      user,
      teams,
      files: Array.from(collectedFiles.values()),
    });
  } catch (error) {
    console.error("Error in POST /api/figma/projects:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync Figma projects" },
      { status: 500 }
    );
  }
}
