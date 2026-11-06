import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decryptGitHubToken, githubCookieName } from "@/lib/github-token";

export const runtime = "nodejs";
const schema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  branch: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  files: z.array(z.object({ path: z.string().min(1).max(500), content: z.string().max(500000) })).min(1).max(20)
});
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" });

export async function POST(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(githubCookieName)?.value);
  if (!token) return NextResponse.json({ error: "GitHub is not connected." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid commit request." }, { status: 400 });
  const { repo, branch, message, files } = parsed.data;
  if (new Set(files.map(file => file.path)).size !== files.length || files.some(file => file.path.startsWith("/") || file.path.split("/").includes(".."))) return NextResponse.json({ error: "File paths must be unique repository-relative paths." }, { status: 400 });
  const results: { path: string; status: "created" | "updated" }[] = [];
  for (const file of files) {
    const endpoint = `https://api.github.com/repos/${repo}/contents/${file.path.split("/").map(encodeURIComponent).join("/")}`;
    const existing = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers: headers(token), cache: "no-store" });
    let sha: string | undefined;
    if (existing.ok) {
      const data = await existing.json();
      if (data.type !== "file") return NextResponse.json({ error: `Not a file: ${file.path}` }, { status: 400 });
      sha = data.sha;
    } else if (existing.status !== 404) {
      return NextResponse.json({ error: `Could not inspect ${file.path} before commit.` }, { status: existing.status });
    }
    const body: Record<string, string> = { message, content: Buffer.from(file.content, "utf8").toString("base64"), branch };
    if (sha) body.sha = sha;
    const saved = await fetch(endpoint, { method: "PUT", headers: headers(token), body: JSON.stringify(body) });
    const data = await saved.json().catch(() => ({}));
    if (!saved.ok) return NextResponse.json({ error: data.message || `GitHub rejected ${file.path}.`, committed: results }, { status: saved.status });
    results.push({ path: file.path, status: sha ? "updated" : "created" });
  }
  return NextResponse.json({ ok: true, files: results, commitUrl: `https://github.com/${repo}/commits/${encodeURIComponent(branch)}` });
}
