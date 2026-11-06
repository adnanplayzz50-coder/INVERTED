import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestAI } from "@/lib/ai-provider";

export const runtime = "nodejs";
const schema = z.object({ prompt: z.string().min(1).max(12000), context: z.array(z.object({ path: z.string().max(500), content: z.string().max(50000) })).max(20).optional() });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid prompt or file context." }, { status: 400 });
    const { prompt, context = [] } = parsed.data;
    const { data, provider } = await requestAI([
      { role: "system", content: "You are the coding assistant inside INVERTED. Focus on understanding supplied project files, planning precise code changes, and explaining destination paths. Never claim a change was committed. Return actionable code and file paths." },
      { role: "user", content: "Request:\n" + prompt + "\n\nProject files:\n" + context.map(file => "--- " + file.path + " ---\n" + file.content).join("\n\n") }
    ]);
    return NextResponse.json({ result: data.choices?.[0]?.message?.content ?? "", usage: data.usage ?? null, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: /All configured AI providers failed|Configure the primary provider|AI_PROVIDER/.test(message) ? 503 : 500 });
  }
}
