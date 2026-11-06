import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { status: "configured" | "incomplete"; message: string; missing?: string[] };

function checkVariables(names: string[], message: string): Check {
  const missing = names.filter(name => !process.env[name]?.trim());
  return missing.length
    ? { status: "incomplete", message, missing }
    : { status: "configured", message: "All required environment variables are present." };
}

export async function GET() {
  const github = checkVariables(
    ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    "Add the GitHub OAuth credentials in Vercel. The redirect URI is optional because the app can generate its callback URL."
  );
  const ai = checkVariables(
    ["AI_API_KEY", "AI_API_URL", "AI_MODEL"],
    "Add the server-side AI provider endpoint, API key and model in Vercel."
  );
  const security = checkVariables(
    ["SITE_PASSWORD", "AUTH_SECRET"],
    "Add SITE_PASSWORD and AUTH_SECRET. AUTH_SECRET must contain at least 32 characters."
  );
  if (security.status === "configured" && (process.env.AUTH_SECRET?.length ?? 0) < 32) {
    security.status = "incomplete";
    security.message = "AUTH_SECRET must be at least 32 characters long.";
    security.missing = ["AUTH_SECRET (at least 32 characters)"];
  }

  const supabaseVars = ["SUPABASE_SERVICE_ROLE_KEY"];
  const hasUrl = Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim());
  if (!hasUrl) supabaseVars.unshift("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  const supabaseMissing = supabaseVars.filter(name =>
    name === "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
      ? !hasUrl
      : !process.env[name]?.trim()
  );
  let supabase: Check;
  if (supabaseMissing.length) {
    supabase = {
      status: "incomplete",
      message: "Add the Supabase project URL and server-side service-role key in Vercel.",
      missing: supabaseMissing
    };
  } else {
    try {
      const { data, error } = await getSupabaseAdmin().storage.getBucket("inverted-media");
      if (error || !data) {
        const detail = error?.message || "Supabase returned no bucket data.";
        const code = error && "statusCode" in error ? String(error.statusCode) : "";
        const hint = /not found|does not exist|404/i.test(detail)
          ? "The configured Supabase project does not contain this bucket. Confirm SUPABASE_URL points to the project shown in your Supabase dashboard."
          : /permission|unauthorized|jwt|invalid.*key|service.role|403|401/i.test(detail + " " + code)
            ? "The configured key may not be the service-role/secret key for this same Supabase project. Replace SUPABASE_SERVICE_ROLE_KEY with the server-side key from Project Settings → API."
            : "Confirm the project URL and service-role key belong to the same Supabase project.";
        supabase = {
          status: "incomplete",
          message: "Could not verify 'inverted-media'. " + detail + (code ? " (HTTP " + code + "). " : " ") + hint,
          missing: ["Supabase bucket verification"]
        };
      } else {
        supabase = { status: "configured", message: "Supabase credentials are working and the inverted-media bucket exists." };
      }
    } catch {
      supabase = {
        status: "incomplete",
        message: "Supabase could not be reached with the configured server credentials. Check the project URL and service-role key."
      };
    }
  }

  return NextResponse.json({ github, supabase, ai, security }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
