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
    const form = await request.formData();
    const file = form.get("file");
    const folder = form.get("folder") === "music" ? "music" : "videos";
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    const maxSize = folder === "music" ? 25 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size <= 0 || file.size > maxSize) return NextResponse.json({ error: "File exceeds the " + (folder === "music" ? "25 MB" : "100 MB") + " upload limit." }, { status: 413 });
    const valid = folder === "music" ? /^(audio\/(mpeg|mp4|wav|ogg|aac|flac|webm)|application\/octet-stream)$/.test(file.type) : /^(video\/(mp4|webm|quicktime|ogg|x-matroska)|application\/octet-stream)$/.test(file.type);
    if (!valid) return NextResponse.json({ error: folder === "music" ? "Choose an audio file (MP3, M4A, WAV, OGG or FLAC)." : "Choose a video file (MP4, WebM, MOV or OGG)." }, { status: 415 });
    const path = folder + "/" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "-" + safeName(file.name);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type || (folder === "music" ? "audio/mpeg" : "video/mp4"), cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(data.path, 3600);
    if (signedError) throw signedError;
    return NextResponse.json({ ok: true, item: { name: file.name, path: data.path, size: file.size, mimeType: file.type, url: signed.signedUrl } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload media." }, { status: 503 });
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