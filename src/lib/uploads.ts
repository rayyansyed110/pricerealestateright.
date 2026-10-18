import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";
import { db, schema } from "@/db";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX = 8 * 1024 * 1024;

/**
 * Saves an uploaded image and returns its public URL.
 * Storage, in order of preference:
 *  1. Vercel Blob   — if BLOB_READ_WRITE_TOKEN is set (Vercel → Storage → Blob)
 *  2. Local disk    — on a normal server / VPS (UPLOAD_DIR)
 *  3. The database  — fallback for hosts without a writable disk (e.g. Vercel without Blob)
 */
export async function saveImage(file: File): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed");
  if (file.size > MAX) throw new Error("Image must be 8 MB or smaller");
  const buf = Buffer.from(await file.arrayBuffer());
  // verify magic bytes so a renamed file can't sneak through
  const sig = buf.subarray(0, 12).toString("hex");
  const okSig = sig.startsWith("ffd8ff") || sig.startsWith("89504e47") || sig.startsWith("47494638") || (sig.startsWith("52494646") && buf.subarray(8, 12).toString() === "WEBP");
  if (!okSig) throw new Error("File is not a valid image");
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`photos/${name}`, buf, { access: "public", contentType: file.type });
    return blob.url;
  }
  if (!process.env.VERCEL) {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, name), buf);
      return `/api/files/${name}`;
    } catch {
      /* read-only disk: fall through to database storage */
    }
  }
  const [row] = await db.insert(schema.files).values({ mime: file.type, data: buf }).returning({ id: schema.files.id });
  return `/api/files/db-${row.id}.${ext}`;
}
