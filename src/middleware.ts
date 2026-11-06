import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

function valid(token?: string) {
  if (!token || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = createHmac("sha256", process.env.AUTH_SECRET).update(expires).digest();
  let actual: Buffer;
  try { actual = Buffer.from(supplied, "hex"); } catch { return false; }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("inverted_session")?.value;
  if (valid(token)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!login|api/login|api/logout|_next/static|_next/image|favicon.ico).*)"] };
