import { NextRequest, NextResponse } from "next/server";
import { decryptGitHubToken, githubCookieName } from "@/lib/github-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(githubCookieName)?.value);
  if (!token) return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ error: "GitHub authorization expired or was revoked. Connect again." }, { status: 401 });
  const user = await response.json();
  return NextResponse.json({ user: { login: user.login, avatarUrl: user.avatar_url } }, { headers: { "Cache-Control": "no-store" } });
}
