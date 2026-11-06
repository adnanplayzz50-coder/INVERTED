type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type Provider = { name: "groq" | "gemini"; key: string; endpoint: string; model: string };

function providerConfig(name: "groq" | "gemini"): Provider | null {
  const preferred = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (name === "groq") {
    const key = process.env.GROQ_API_KEY || (preferred === "groq" ? process.env.AI_API_KEY : undefined);
    if (!key) return null;
    const url = new URL((process.env.GROQ_API_URL || (preferred === "groq" ? process.env.AI_API_URL : undefined) || "https://api.groq.com/openai/v1/chat/completions").trim());
    if (url.protocol !== "https:" || url.hostname !== "api.groq.com") throw new Error("Groq endpoint must use https://api.groq.com.");
    return { name, key, endpoint: url.origin + url.pathname.replace(/\/+$/, ""), model: process.env.GROQ_MODEL || (preferred === "groq" ? process.env.AI_MODEL : undefined) || "openai/gpt-oss-120b" };
  }
  const key = process.env.GEMINI_API_KEY || (preferred === "gemini" ? process.env.AI_API_KEY : undefined);
  if (!key) return null;
  const url = new URL((process.env.GEMINI_API_URL || (preferred === "gemini" ? process.env.AI_API_URL : undefined) || "https://generativelanguage.googleapis.com").trim().replace(/\/+$/, ""));
  if (url.protocol !== "https:" || url.hostname !== "generativelanguage.googleapis.com") throw new Error("Gemini endpoint must use https://generativelanguage.googleapis.com.");
  const path = url.pathname.replace(/\/+$/, "");
  const endpoint = path.endsWith("/v1beta/openai/chat/completions") ? url.origin + path
    : path.endsWith("/v1beta/openai") ? url.origin + path + "/chat/completions"
    : path.endsWith("/v1beta") ? url.origin + path + "/openai/chat/completions"
    : url.origin + "/v1beta/openai/chat/completions";
  return { name, key, endpoint, model: process.env.GEMINI_MODEL || (preferred === "gemini" ? process.env.AI_MODEL : undefined) || "gemini-2.5-flash" };
}

export async function requestAI(
  messages: ChatMessage[],
  options: { temperature?: number; responseFormat?: { type: "json_object" } } = {}
): Promise<{ data: any; provider: "groq" | "gemini" }> {
  const preferred = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (preferred !== "groq" && preferred !== "gemini") throw new Error("AI_PROVIDER must be either groq or gemini.");
  const primary = providerConfig(preferred);
  const backup = providerConfig(preferred === "groq" ? "gemini" : "groq");
  if (!primary && !backup) throw new Error("Configure GROQ_API_KEY and GEMINI_API_KEY in Vercel.");
  const providers = [primary, backup].filter((item): item is Provider => Boolean(item));
  const failures: string[] = [];
  for (const provider of providers) {
    const body: Record<string, unknown> = { model: provider.model, messages };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.responseFormat) body.response_format = options.responseFormat;
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await fetch(provider.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + provider.key },
          body: JSON.stringify(body), cache: "no-store"
        });
      } catch (error) {
        failures.push(provider.name + " network error: " + (error instanceof Error ? error.message : "request failed"));
        break;
      }
      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
      if (response.ok) return { data, provider: provider.name };
      failures.push(provider.name + " HTTP " + response.status + ": " + (data.error?.message || data.message || raw.slice(0, 400) || "No error details returned."));
      const transient = [408, 429, 500, 502, 503, 504].includes(response.status);
      if (transient && attempt === 0) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await new Promise(resolve => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 3000) : 700));
        continue;
      }
      if (!transient) break;
    }
  }
  throw new Error("All configured AI providers failed. " + failures.join(" | "));
}
