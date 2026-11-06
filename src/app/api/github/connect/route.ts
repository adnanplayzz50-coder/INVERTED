import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "GITHUB_CLIENT_ID is not configured." }, { status: 503 });
  const state = randomBytes(24).toString("hex");
  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", clientId);
  redirect.searchParams.set("redirect_uri", process.env.GITHUB_REDIRECT_URI || new URL("/api/github/callback", request.url).toString());
  redirect.searchParams.set("scope", "repo read:user");
  redirect.searchParams.set("state", state);
  const response = NextResponse.redirect(redirect);
  response.cookies.set("inverted_github_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
