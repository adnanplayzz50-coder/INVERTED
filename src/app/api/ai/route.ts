import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
const schema = z.object({ prompt: z.string().min(1).max(12000), context: z.array(z.object({ path: z.string().max(500), content: z.string().max(50000) })).max(20).optional() });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid prompt or file context." }, { status: 400 });
    const { prompt, context = [] } = parsed.data;
    const { AI_API_KEY, AI_API_URL, AI_MODEL } = process.env;
    if (!AI_API_KEY || !AI_API_URL || !AI_MODEL) return NextResponse.json({ error: "Configure AI_API_KEY, AI_API_URL and AI_MODEL in Vercel settings." }, { status: 503 });
    const configuredUrl = AI_API_URL.trim().replace(/\/+$/, "");
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.hostname !== "generativelanguage.googleapis.com" || parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "For Gemini, AI_API_URL must use https://generativelanguage.googleapis.com. Current host: " + parsedUrl.hostname }, { status: 400 });
    }
    const apiPath = parsedUrl.pathname.replace(/\/+$/, "");
    const endpoint = apiPath.endsWith("/v1beta/openai/chat/completions")
      ? parsedUrl.origin + apiPath
      : apiPath.endsWith("/v1beta/openai")
        ? parsedUrl.origin + apiPath + "/chat/completions"
        : apiPath.endsWith("/v1beta")
          ? parsedUrl.origin + apiPath + "/openai/chat/completions"
          : parsedUrl.origin + "/v1beta/openai/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [
        { role: "system", content: "You are the coding assistant inside INVERTED. Focus on understanding supplied project files, planning precise code changes, and explaining destination paths. Never claim a change was committed. Return actionable code and file paths." },
        { role: "user", content: `Request:\n${prompt}\n\nProject files:\n${context.map(file => `--- ${file.path} ---\n${file.content}`).join("\n\n")}` }
      ] })
    });
    const rawBody = await response.text();
    let data: any = {};
    try { data = rawBody ? JSON.parse(rawBody) : {}; } catch { data = {}; }
    if (!response.ok) return NextResponse.json({ error: "Gemini returned HTTP " + response.status + " from " + new URL(endpoint).host + ": " + (data.error?.message || data.message || rawBody.slice(0, 500) || "No error details returned.") + (response.status === 404 ? " Check AI_API_URL and AI_MODEL in Vercel." : "") }, { status: 502 });
    return NextResponse.json({ result: data.choices?.[0]?.message?.content ?? "", usage: data.usage ?? null });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 500 }); }
}
