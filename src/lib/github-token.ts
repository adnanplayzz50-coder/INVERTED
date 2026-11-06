import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const COOKIE = "inverted_github";
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return createHash("sha256").update(secret).digest();
}
export function encryptGitHubToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}
export function decryptGitHubToken(value?: string) {
  if (!value) return null;
  try {
    const [iv, tag, data] = value.split(".");
    if (!iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch { return null; }
}
export const githubCookieName = COOKIE;
