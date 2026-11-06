import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "inverted-media";
const safeName = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

export async function GET(request: NextRequest) {
  try {
    const folder = request.nextUrl.searchParams.get("folder") === "music" ? "music" : "videos";
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    const files = (data ?? []).filter(item => item.name && item.id);
    const paths = files.map(item => folder + "/" + item.name);
    const signed = paths.length ? await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600) : { data: [], error: null };
    if (signed.error) throw signed.error;
    const signedByPath = new Map((signed.data ?? []).map(item => [item.path, item.signedUrl]));
    return NextResponse.json({ items: files.map(item => ({ name: item.name, path: folder + "/" + item.name, size: item.metadata?.size ?? null, mimeType: item.metadata?.mimetype ?? null, createdAt: item.created_at, url: signedByPath.get(folder + "/" + item.name) ?? null })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list media." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string; folder?: string; contentType?: string };
    const folder = body.folder === "music" ? "music" : "videos";
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 180) return NextResponse.json({ error: "A valid file name is required." }, { status: 400 });
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const valid = folder === "music" ? /^(audio\/(mpeg|mp4|wav|ogg|aac|flac|webm)|application\/octet-stream)$/.test(contentType) : /^(video\/(mp4|webm|quicktime|ogg|x-matroska)|application\/octet-stream)$/.test(contentType);
    if (!valid) return NextResponse.json({ error: folder === "music" ? "Choose an audio file (MP3, M4A, WAV, OGG or FLAC)." : "Choose a video file (MP4, WebM, MOV or OGG)." }, { status: 415 });
    const path = folder + "/" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "-" + safeName(body.name);
    const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    const baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
    return NextResponse.json({ path, token: data.token, uploadUrl: baseUrl + "/storage/v1" + data.signedUrl, contentType });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare media upload." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path");
    if (!path || !/^(videos|music)\/[a-zA-Z0-9._-]+$/.test(path)) return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete media." }, { status: 503 });
  }
}