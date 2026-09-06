import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { repoUrl } = await req.json();
    
    // Parse owner and repo name from URL: https://github.com/owner/repo
    const match = repoUrl ? repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/) : null;
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    // Fetch key configuration and styling files directly (trying main then master branch)
    const [pkgRes, tailwindRes, globalsRes] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/package.json`)
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/package.json`)),
      fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/tailwind.config.ts`)
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/tailwind.config.js`))
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/tailwind.config.ts`))
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/tailwind.config.js`)),
      fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/app/globals.css`)
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/src/app/globals.css`))
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/app/globals.css`))
        .then(r => r.ok ? r : fetch(`https://raw.githubusercontent.com/${owner}/${cleanRepo}/master/src/app/globals.css`))
    ]);

    const packageJson = pkgRes.ok ? await pkgRes.text() : null;
    const tailwindConfig = tailwindRes.ok ? await tailwindRes.text() : null;
    const globalsCss = globalsRes.ok ? await globalsRes.text() : null;

    let dependencies = {};
    if (packageJson) {
      try {
        dependencies = JSON.parse(packageJson).dependencies || {};
      } catch {
        // ignore JSON parse error
      }
    }

    return NextResponse.json({
      success: true,
      repoData: {
        dependencies,
        tailwindConfig,
        globalsCss,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
