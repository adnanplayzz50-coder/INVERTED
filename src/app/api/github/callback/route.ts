import { NextRequest, NextResponse } from "next/server";
import { encryptGitHubToken, githubCookieName } from "@/lib/github-token";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const url = new URL("/", request.url);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("inverted_github_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    url.searchParams.set("github", "oauth-error");
    return NextResponse.redirect(url);
  }
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("GitHub OAuth credentials are not configured.");
    const exchange = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    const result = await exchange.json();
    if (!exchange.ok || !result.access_token) throw new Error("GitHub authorization failed.");
    const response = NextResponse.redirect(url);
    response.cookies.set(githubCookieName, encryptGitHubToken(result.access_token), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set("inverted_github_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch {
    url.searchParams.set("github", "oauth-error");
    return NextResponse.redirect(url);
  }
}
