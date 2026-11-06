import { NextRequest, NextResponse } from "next/server";

async function valid(token?: string) {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || !/^\\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = Uint8Array.from(supplied.match(/.{1,2}/g) ?? [], byte => parseInt(byte, 16));
    if (signature.length !== 32 || [...signature].some(n => Number.isNaN(n))) return false;
    return await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(expires));
  } catch { return false; }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("inverted_session")?.value;
  if (await valid(token)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!login|api/login|api/logout|_next/static|_next/image|favicon.ico).*)"] };
