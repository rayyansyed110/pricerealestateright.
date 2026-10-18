import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { UPLOAD_DIR } from "@/lib/uploads";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const CACHE = "public, max-age=31536000, immutable";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[\w-]+\.(jpg|png|webp|gif)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    if (name.startsWith("db-")) {
      const id = name.slice(3).replace(/\.\w+$/, "");
      const f = await db.query.files.findFirst({ where: eq(schema.files.id, id) });
      if (!f) return new Response("Not found", { status: 404 });
      return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": CACHE } });
    }
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": MIME[name.split(".").pop()!], "Cache-Control": CACHE } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
