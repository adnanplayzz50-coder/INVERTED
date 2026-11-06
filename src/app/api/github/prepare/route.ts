import { NextRequest, NextResponse } from "next/server";
import { decryptGitHubToken, githubCookieName } from "@/lib/github-token";
import { requestAI } from "@/lib/ai-provider";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function gh(token: string, path: string) {
  const r = await fetch("https://api.github.com" + path, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || "GitHub API request failed.");
  return d;
}
export async function POST(request: NextRequest) {
  const token = decryptGitHubToken(request.cookies.get(githubCookieName)?.value);
  if (!token) return NextResponse.json({ error: "Connect GitHub first." }, { status: 401 });
  try {
    const body = await request.json();
    const repo = body.repo, branch = body.branch, instruction = body.instruction, files = body.files;
    if (typeof repo !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return NextResponse.json({ error: "Select a valid repository." }, { status: 400 });
    if (typeof branch !== "string" || !branch.trim() || typeof instruction !== "string" || !instruction.trim()) return NextResponse.json({ error: "A branch and instruction are required." }, { status: 400 });
    if (!Array.isArray(files) || files.length > 10 || files.some((f: any) => typeof f.name !== "string" || typeof f.content !== "string")) return NextResponse.json({ error: "Upload up to 10 valid text files." }, { status: 400 });
    if (files.reduce((n: number, f: any) => n + Buffer.byteLength(f.content), 0) > 1500000) return NextResponse.json({ error: "Combined uploads must be under 1.5 MB." }, { status: 413 });
    const parts = repo.split("/");
    const owner = parts[0], name = parts[1];
    const repository = await gh(token, "/repos/" + owner + "/" + name);
    const ref = await gh(token, "/repos/" + owner + "/" + name + "/git/ref/heads/" + encodeURIComponent(branch));
    const baseSha = ref.object.sha;
    const tree = await gh(token, "/repos/" + owner + "/" + name + "/git/trees/" + baseSha + "?recursive=1");
    const paths = (tree.tree || []).filter((x: any) => x.type === "blob").map((x: any) => x.path as string);
    const hints = instruction.match(/[\w./@-]+\.[A-Za-z0-9]+/g) || [];
    const keywords = instruction.toLowerCase().split(/[^a-z0-9]+/).filter((word: string) => word.length > 3);
    const scoredPaths = paths.map((path: string) => {
      const lower = path.toLowerCase();
      let score = hints.some((hint: string) => lower === hint.toLowerCase() || lower.endsWith("/" + hint.toLowerCase())) ? 100 : 0;
      for (const word of keywords) if (lower.includes(word)) score += 4;
      if (lower.startsWith("src/") && /\.(tsx?|jsx?|css|json)$/.test(lower)) score += 2;
      if (/(page|layout|route|index|app)\.(tsx?|jsx?)$/.test(lower)) score += 1;
      return { path, score };
    }).filter((item: any) => item.score > 0).sort((a: any, b: any) => b.score - a.score);
    const contextPaths = scoredPaths.slice(0, 10).map((item: any) => item.path);
    const contextFiles: any[] = [];
    let total = 0;
    for (const path of contextPaths) {
      try {
        const item = await gh(token, "/repos/" + owner + "/" + name + "/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(branch));
        if (item.encoding !== "base64" || !item.content) continue;
        const content = Buffer.from(item.content.replace(/\n/g, ""), "base64").toString("utf8");
        if (total + content.length > 90000) break;
        contextFiles.push({ path, content }); total += content.length;
      } catch {}
    }
    const system = "You are INVERTED, an expert software engineer editing a real GitHub repository. Return ONLY valid JSON: {\"summary\":\"...\",\"changes\":[{\"path\":\"relative/path\",\"content\":\"COMPLETE final file contents\",\"reason\":\"...\"}]}. Produce complete file contents, never patches or placeholders. Use uploaded files as source material and obey requested destination paths. For edits, preserve existing behavior and integrate changes. Only include files that should change. No markdown fences. Paths must be relative, must not start with slash, contain .. or target .git. If upload destination is unspecified, use its filename at repository root and mention that.";
    const payload = { repository: repo, branch, repositoryFilePaths: paths.slice(0, 500), existingFileContents: contextFiles, uploadedFiles: files, instruction: instruction.trim() };
    const { data: result, provider } = await requestAI(
      [{ role: "system", content: system }, { role: "user", content: JSON.stringify(payload) }],
      { temperature: 0.15, responseFormat: { type: "json_object" } }
    );
    const raw = result.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return NextResponse.json({ error: "AI returned an unexpected response. Check AI_API_URL and AI_MODEL." }, { status: 502 });
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.changes) || !parsed.changes.length || parsed.changes.length > 20) return NextResponse.json({ error: "AI did not return file changes. Be more specific about the destination paths." }, { status: 422 });
    const seen = new Set<string>();
    const changes = parsed.changes.map((x: any) => {
      const path = String(x.path || "");
      if (!path || path.startsWith("/") || path.split("/").includes("..") || path.split("/").includes(".git") || path.length > 240 || seen.has(path) || typeof x.content !== "string") throw new Error("AI returned an invalid or unsafe file path.");
      if (Buffer.byteLength(x.content) > 500000) throw new Error("Generated file is too large: " + path);
      seen.add(path);
      return { path, content: x.content, reason: String(x.reason || "Updated by AI"), action: paths.includes(path) ? "edit" : "create" };
    });
    return NextResponse.json({ summary: String(parsed.summary || "Prepared changes."), changes, baseSha, repo, branch, defaultBranch: repository.default_branch, provider }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare changes.";
    return NextResponse.json({ error: message }, { status: /All configured AI providers failed|Configure the primary provider|AI_PROVIDER/.test(message) ? 503 : 500 });
  }
}