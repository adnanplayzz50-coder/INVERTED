import { NextRequest, NextResponse } from "next/server";
import { decryptGitHubToken, githubCookieName } from "@/lib/github-token";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(githubCookieName)?.value);
  if (!token) return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: "Unable to load GitHub repositories." }, { status: response.status });
  return NextResponse.json({ repos: data.map((repo: { full_name: string; default_branch: string; private: boolean; html_url: string }) => ({ fullName: repo.full_name, defaultBranch: repo.default_branch, private: repo.private, url: repo.html_url })) });
}
