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
}

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("authorization");
    let accessToken: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.replace("Bearer ", "").trim();
    } else if (authHeader && authHeader.startsWith("figd_")) {
      accessToken = authHeader.trim();
    } else {
      try {
        accessToken = await getValidFigmaToken(cookieHeader);
      } catch {
        return NextResponse.json(
          { error: "Not authenticated with Figma", authenticated: false },
          { status: 401 }
        );
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Figma access token available", authenticated: false },
        { status: 401 }
      );
    }

    const isPat = accessToken.startsWith("figd_");
    const headers: Record<string, string> = isPat
      ? { "X-Figma-Token": accessToken }
      : { Authorization: `Bearer ${accessToken}` };

    // 1. Fetch current user info
    let user: FigmaUser | null = null;
    try {
      const meRes = await fetch("https://api.figma.com/v1/me", { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        user = {
          id: meData.id || "",
          email: meData.email || "",
          handle: meData.handle || meData.name || "Figma User",
          img_url: meData.img_url || "",
        };
      }
    } catch (e) {
      console.warn("Could not fetch Figma /v1/me:", e);
    }

    const files: FigmaProjectFile[] = [];
    const teams: { id: string; name: string }[] = [];

    // 2. Check if a team_id parameter was passed
    const teamIdParam = request.nextUrl.searchParams.get("team_id");
    const teamIdsToQuery: string[] = teamIdParam ? [teamIdParam] : [];

    for (const teamId of teamIdsToQuery) {
      try {
        const teamProjectsRes = await fetch(
          `https://api.figma.com/v1/teams/${teamId}/projects`,
          { headers }
        );
        if (teamProjectsRes.ok) {
          const teamData = await teamProjectsRes.json();
          teams.push({ id: teamId, name: teamData.name || `Team ${teamId}` });

          const projectList = teamData.projects || [];
          for (const proj of projectList) {
            try {
              const filesRes = await fetch(
                `https://api.figma.com/v1/projects/${proj.id}/files`,
                { headers }
              );
              if (filesRes.ok) {
                const filesData = await filesRes.json();
                for (const f of filesData.files || []) {
                  files.push({
                    key: f.key,
                    name: f.name,
                    thumbnail_url: f.thumbnail_url,
                    last_modified: f.last_modified,
                    project_name: proj.name,
                    project_id: proj.id,
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch files for project ${proj.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch projects for team ${teamId}:`, err);
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      teams,
      files,
    });
  } catch (error) {
    console.error("Error in /api/figma/projects:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Figma projects" },
      { status: 500 }
    );
  }
}
