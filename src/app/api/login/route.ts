import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieName, sessionMaxAge } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let body: { password?: unknown };
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid login request." }, { status: 400 }); }

    const expected = process.env.SITE_PASSWORD;
    if (!expected) return NextResponse.json({ error: "SITE_PASSWORD is missing from Vercel environment variables." }, { status: 503 });
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      return NextResponse.json({ error: "AUTH_SECRET is missing or too short. Set a random string of at least 32 characters in Vercel." }, { status: 503 });
    }
    if (typeof body.password !== "string" || body.password.length > 256 || body.password !== expected) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, createSessionToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: sessionMaxAge,
    });
    return response;
  } catch (error) {
    console.error("INVERTED login error:", error);
    return NextResponse.json({ error: "The server could not create your login session. Check Vercel function logs and environment variables." }, { status: 500 });
  }
}
