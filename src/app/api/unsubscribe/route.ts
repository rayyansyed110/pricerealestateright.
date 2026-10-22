import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyUnsubToken } from "@/lib/email";

// RFC 8058 one-click unsubscribe: email clients POST to the List-Unsubscribe URL
export async function POST(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") || "", t = url.searchParams.get("t") || "";
  if (!verifyUnsubToken(u, t)) return new Response("Invalid", { status: 400 });
  await db.update(schema.users).set({ marketingOptIn: false }).where(eq(schema.users.id, u));
  return new Response("Unsubscribed");
}
