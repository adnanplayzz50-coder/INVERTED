import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieName, sessionMaxAge } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Site password is not configured on the server." }, { status: 503 });
  if (typeof body.password !== "string" || body.password.length > 256 || body.password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: sessionMaxAge,
  });
  return response;
}
