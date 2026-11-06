import { NextRequest, NextResponse } from "next/server";
import { decryptGitHubToken, githubCookieName } from "@/lib/github-token";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(githubCookieName)?.value);
  if (!token) return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  const repo = request.nextUrl.searchParams.get("repo");
  const path = request.nextUrl.searchParams.get("path");
  const ref = request.nextUrl.searchParams.get("ref") || "main";
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !path || path.startsWith("/") || path.split("/").includes("..")) return NextResponse.json({ error: "Invalid repository or file path." }, { status: 400 });
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || Array.isArray(data) || data.type !== "file") return NextResponse.json({ error: "File could not be read." }, { status: response.status || 404 });
  return NextResponse.json({ path, sha: data.sha, content: Buffer.from(data.content, "base64").toString("utf8"), url: data.html_url });
}
