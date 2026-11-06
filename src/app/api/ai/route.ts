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
    const response = await fetch(AI_API_URL, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [
        { role: "system", content: "You are the coding assistant inside INVERTED. Focus on understanding supplied project files, planning precise code changes, and explaining destination paths. Never claim a change was committed. Return actionable code and file paths." },
        { role: "user", content: `Request:\n${prompt}\n\nProject files:\n${context.map(file => `--- ${file.path} ---\n${file.content}`).join("\n\n")}` }
      ] })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "AI provider request failed." }, { status: 502 });
    return NextResponse.json({ result: data.choices?.[0]?.message?.content ?? "", usage: data.usage ?? null });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 500 }); }
}
