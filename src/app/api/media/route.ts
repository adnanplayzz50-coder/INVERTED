import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const BUCKET = "inverted-media";
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

export async function GET(request: NextRequest) {
  try {
    const folder = request.nextUrl.searchParams.get("folder") === "music" ? "music" : "videos";
    const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    return NextResponse.json({ items: (data ?? []).filter(item => item.name).map(item => ({ name: item.name, id: item.id, size: item.metadata?.size ?? null, mimeType: item.metadata?.mimetype ?? null, createdAt: item.created_at })) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list media." }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string; folder?: string; contentType?: string };
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 180) return NextResponse.json({ error: "A valid file name is required." }, { status: 400 });
    const folder = body.folder === "music" ? "music" : "videos";
    const name = `${folder}/${Date.now()}-${safeName(body.name)}`;
    const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(name);
    if (error) throw error;
    return NextResponse.json({ path: name, token: data.token, signedUrl: data.signedUrl, bucket: BUCKET });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare upload." }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path");
    if (!path || !/^(videos|music)\/[a-zA-Z0-9._-]+$/.test(path)) return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete media." }, { status: 503 }); }
}
