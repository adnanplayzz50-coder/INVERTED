import { NextRequest, NextResponse } from "next/server";
import { decryptGitHubToken, githubCookieName } from "@/lib/github-token";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const common = (token: string) => ({ Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" });
async function gh(token: string, path: string, init?: RequestInit) {
  const r = await fetch("https://api.github.com" + path, { ...init, headers: { ...common(token), ...(init?.headers || {}) }, cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "GitHub API failed: " + r.status);
  return d;
}
export async function POST(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(githubCookieName)?.value);
  if (!token) return NextResponse.json({ error: "Connect GitHub first." }, { status: 401 });
  try {
    const body = await request.json();
    const { repo, branch, baseSha, changes } = body;
    if (typeof repo !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(repo) || typeof branch !== "string" || typeof baseSha !== "string" || !Array.isArray(changes) || !changes.length || changes.length > 20) return NextResponse.json({ error: "Invalid commit request." }, { status: 400 });
    for (const item of changes) if (typeof item.path !== "string" || item.path.startsWith("/") || item.path.split("/").includes("..") || item.path.split("/").includes(".git") || typeof item.content !== "string" || Buffer.byteLength(item.content) > 500000) return NextResponse.json({ error: "A file path or content is invalid." }, { status: 400 });
    const [owner, name] = repo.split("/");
    const ref = await gh(token, "/repos/" + owner + "/" + name + "/git/ref/heads/" + encodeURIComponent(branch));
    if (ref.object.sha !== baseSha) return NextResponse.json({ error: "This branch changed after preparation. Prepare the changes again to avoid overwriting newer work." }, { status: 409 });
    const blobs = await Promise.all(changes.map(async (item: any) => {
      const blob = await gh(token, "/repos/" + owner + "/" + name + "/git/blobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: item.content, encoding: "utf-8" }) });
      return { path: item.path, mode: "100644", type: "blob", sha: blob.sha };
    }));
    const tree = await gh(token, "/repos/" + owner + "/" + name + "/git/trees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_tree: ref.object.sha, tree: blobs }) });
    const commit = await gh(token, "/repos/" + owner + "/" + name + "/git/commits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "INVERTED AI: update " + changes.length + " file" + (changes.length === 1 ? "" : "s"), tree: tree.sha, parents: [ref.object.sha] }) });
    await gh(token, "/repos/" + owner + "/" + name + "/git/refs/heads/" + encodeURIComponent(branch), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: commit.sha, force: false }) });
    return NextResponse.json({ success: true, commit: commit.sha, url: "https://github.com/" + repo + "/commit/" + commit.sha, files: changes.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub commit failed." }, { status: 500 });
  }
}