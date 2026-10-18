import { timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Called by the sister sites (MLS comps site / PriceMortgageRight.com) to mark that a
 * user has used them, which unlocks bonus guesses here.
 *
 * POST /api/sister-sites/verify
 * Headers: Authorization: Bearer <SISTER_SITE_SECRET>
 * Body:    { "email": "player@example.com", "site": "mls" | "mortgage" }
 */
export async function POST(req: Request) {
  const secret = process.env.SISTER_SITE_SECRET || "";
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const site = body?.site;
  if (!email || (site !== "mls" && site !== "mortgage")) return Response.json({ error: "Expected { email, site: 'mls' | 'mortgage' }" }, { status: 400 });

  const set = site === "mls" ? { usedMlsComps: true } : { usedMortgageSite: true };
  const res = await db.update(schema.users).set(set).where(eq(schema.users.email, email)).returning({ id: schema.users.id });
  return Response.json({ ok: true, matched: res.length > 0 });
}
