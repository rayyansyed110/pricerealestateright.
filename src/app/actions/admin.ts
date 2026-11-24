"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { fromZonedTime } from "date-fns-tz";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { closeGame } from "@/lib/game";
import { saveSettings, DEFAULT_SETTINGS, setTextSetting } from "@/lib/settings";
import { sendMarketingEmail } from "@/lib/email";
import { isProCategory, normalizeUrl } from "@/lib/pro";
import { saveImage } from "@/lib/uploads";
import { slugify, TZ } from "@/lib/format";
import type { FormState } from "./auth";

const intish = z.preprocess((v) => (v === "" || v == null ? undefined : Number(String(v).replace(/[$,\s]/g, ""))), z.number().int().nonnegative().optional());
const numish = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().nonnegative().optional());
const localDT = (v: unknown) => (typeof v === "string" && v ? fromZonedTime(v, TZ) : undefined); // <input type=datetime-local> in game timezone

const gameSchema = z.object({
  address: z.string().trim().min(3, "Address is required").max(160),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(30),
  zip: z.string().trim().max(12).optional(),
  listPrice: intish.refine((v) => v && v > 0, "List price is required"),
  beds: numish.refine((v) => v != null, "Beds required"),
  baths: numish.refine((v) => v != null, "Baths required"),
  sqft: intish.refine((v) => v != null, "Sq ft required"),
  lotSizeValue: numish,
  lotSizeUnit: z.enum(["acres", "sq ft"]).optional(),
  yearBuilt: intish,
  propertyType: z.string().trim().max(60).optional(),
  lastSoldPrice: intish,
  lastSoldDate: z.string().optional(),
  features: z.string().trim().max(2000).optional(),
  description: z.string().trim().max(5000).optional(),
  mlsNumber: z.string().trim().max(40).optional(),
  mlsUrl: z.string().trim().url().optional().or(z.literal("")),
  opensAt: z.string().min(1, "Open date required"),
  closesAt: z.string().min(1, "Close date required"),
  prizeAmount: intish,
  listingAgentId: z.string().optional(),
  buyerAgentId: z.string().optional(),
  published: z.literal("on").optional(),
});

export async function saveGameAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(fd.get("id") || "");
  const p = gameSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: `${p.error.issues[0].path[0]}: ${p.error.issues[0].message}` };
  const d = p.data;
  const opensAt = localDT(d.opensAt)!, closesAt = localDT(d.closesAt)!;
  if (closesAt <= opensAt) return { error: "Close date must be after open date" };
  const values = {
    address: d.address, city: d.city, state: d.state, zip: d.zip || null,
    listPrice: d.listPrice!, beds: d.beds!, baths: d.baths!, sqft: d.sqft!,
    lotSize: d.lotSizeValue != null ? `${Number(d.lotSizeValue).toLocaleString("en-US", { maximumFractionDigits: 3 })} ${d.lotSizeUnit ?? "acres"}` : null, yearBuilt: d.yearBuilt ?? null, propertyType: d.propertyType || null,
    lastSoldPrice: d.lastSoldPrice ?? null, lastSoldDate: d.lastSoldDate ? fromZonedTime(d.lastSoldDate, TZ) : null,
    features: d.features || null, description: d.description || null, mlsNumber: d.mlsNumber || null, mlsUrl: d.mlsUrl || null,
    opensAt, closesAt, prizeAmount: d.prizeAmount ?? DEFAULT_SETTINGS.gamePrize,
    listingAgentId: d.listingAgentId || null, buyerAgentId: d.buyerAgentId || null, published: !!d.published,
  };
  // videos entered on the new-listing form (validated before anything is saved)
  const newVideos: { type: "AGENT_PROMO" | "WALKTHROUGH" | "CLOSING"; title: string; url: string; agentId: string | null }[] = [];
  for (let i = 0; i < 20; i++) {
    const url = String(fd.get(`video_url_${i}`) || "").trim();
    if (!url) continue;
    if (!/^https:\/\/\S+$/.test(url)) return { error: `Video ${i + 1}: link must start with https://` };
    const t = String(fd.get(`video_type_${i}`) || "AGENT_PROMO");
    const type = (["AGENT_PROMO", "WALKTHROUGH", "CLOSING"].includes(t) ? t : "AGENT_PROMO") as "AGENT_PROMO" | "WALKTHROUGH" | "CLOSING";
    const defaults = { AGENT_PROMO: "Meet the Agent & Neighborhood Intro", WALKTHROUGH: "Property Walkthrough & Features Tour", CLOSING: "Closing & Negotiation Walkthrough" };
    const title = String(fd.get(`video_title_${i}`) || "").trim().slice(0, 120) || defaults[type];
    newVideos.push({ type, title, url, agentId: String(fd.get(`video_agent_${i}`) || "") || null });
  }

  // save uploaded photos first, so a failed upload doesn't leave a half-created game
  const photoUrls: string[] = [];
  for (const f of fd.getAll("photos")) {
    if (f instanceof File && f.size > 0) {
      try { photoUrls.push(await saveImage(f)); }
      catch (e) { return { error: `Photo "${f.name}": ${(e as Error).message}` }; }
    }
  }
  photoUrls.push(...String(fd.get("photoUrls") || "").split(/\s+/).filter((u) => /^https:\/\//.test(u)));

  let gid = id;
  if (id) {
    await db.update(schema.games).set(values).where(eq(schema.games.id, id));
  } else {
    let slug = slugify(`${d.address} ${d.city} ${d.state}`);
    if (await db.query.games.findFirst({ where: eq(schema.games.slug, slug) })) slug += "-" + Date.now().toString(36);
    const [g] = await db.insert(schema.games).values({ ...values, slug }).returning();
    gid = g.id;
  }
  const existing = await db.select({ id: schema.photos.id }).from(schema.photos).where(eq(schema.photos.gameId, gid));
  for (const [i, url] of photoUrls.entries()) await db.insert(schema.photos).values({ gameId: gid, url, sortOrder: existing.length + i });
  if (newVideos.length) await db.insert(schema.videos).values(newVideos.map((v, i) => ({ ...v, gameId: gid, approved: true, sortOrder: i })));
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/games/${gid}?created=1`);
  return { ok: "Game saved" };
}

export async function deleteGameAction(fd: FormData) {
  await requireAdmin();
  await db.delete(schema.games).where(eq(schema.games.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
  redirect("/admin/games");
}

export async function deletePhotoAction(fd: FormData) {
  await requireAdmin();
  await db.delete(schema.photos).where(eq(schema.photos.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
}

export async function makeCoverPhotoAction(fd: FormData) {
  await requireAdmin();
  const [ph] = await db.select().from(schema.photos).where(eq(schema.photos.id, String(fd.get("id"))));
  if (ph) {
    await db.update(schema.photos).set({ sortOrder: 1 }).where(and(eq(schema.photos.gameId, ph.gameId), ne(schema.photos.id, ph.id)));
    await db.update(schema.photos).set({ sortOrder: 0 }).where(eq(schema.photos.id, ph.id));
  }
  revalidatePath("/", "layout");
}

export async function addVideoAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({
    gameId: z.string().min(1), type: z.enum(["AGENT_PROMO", "WALKTHROUGH", "CLOSING"]),
    title: z.string().trim().min(3).max(120), url: z.string().trim().url(), description: z.string().trim().max(600).optional(),
    agentId: z.string().optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const [{ m }] = await db.select({ m: sql<number>`coalesce(max(${schema.videos.sortOrder}), -1)::int` }).from(schema.videos).where(eq(schema.videos.gameId, p.data.gameId));
  await db.insert(schema.videos).values({ ...p.data, agentId: p.data.agentId || null, approved: true, sortOrder: m + 1 });
  revalidatePath("/", "layout");
  return { ok: "Video added" };
}

/** Move a video up or down in its game's display order. */
export async function moveVideoAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id")); const dir = fd.get("dir") === "up" ? -1 : 1;
  const v = await db.query.videos.findFirst({ where: eq(schema.videos.id, id) });
  if (!v) return;
  const list = await db.select({ id: schema.videos.id }).from(schema.videos).where(eq(schema.videos.gameId, v.gameId))
    .orderBy(asc(schema.videos.sortOrder), asc(schema.videos.createdAt));
  const i = list.findIndex((x) => x.id === id), j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  for (const [k, x] of list.entries()) await db.update(schema.videos).set({ sortOrder: k }).where(eq(schema.videos.id, x.id));
  revalidatePath("/", "layout");
}

export async function setVideoApprovalAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  if (fd.get("op") === "delete") await db.delete(schema.videos).where(eq(schema.videos.id, id));
  else await db.update(schema.videos).set({ approved: fd.get("op") === "approve" }).where(eq(schema.videos.id, id));
  revalidatePath("/", "layout");
}

export async function closeGameAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(fd.get("id"));
  const price = Number(String(fd.get("finalSalePrice") || "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(price) || price < 1000) return { error: "Enter the final sale price" };
  const g = await db.query.games.findFirst({ where: eq(schema.games.id, id) });
  if (!g) return { error: "Game not found" };
  if (new Date() < g.closesAt) return { error: "Guessing is still open for this game. Wait until the week ends." };
  const sendEmails = fd.get("sendEmails") === "on";
  const r = await closeGame(id, Math.round(price), { sendEmails });
  revalidatePath("/", "layout");
  return { ok: `Game closed. ${r.publicWinner ? "Winner picked." : "No public guesses."} ${sendEmails ? `${r.emailsSent} result emails sent.` : "Emails not sent."}` };
}

export async function reopenGameAction(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id"));
  await db.update(schema.games).set({ finalSalePrice: null, saleClosedAt: null }).where(eq(schema.games.id, id));
  await db.delete(schema.gameWinners).where(eq(schema.gameWinners.gameId, id));
  revalidatePath("/", "layout");
}

export async function deleteGuessAction(fd: FormData) {
  await requireAdmin();
  await db.delete(schema.guesses).where(eq(schema.guesses.id, String(fd.get("id"))));
  revalidatePath("/", "layout");
}

export async function updateUserAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const op = String(fd.get("op"));
  const set: Partial<typeof schema.users.$inferInsert> = {};
  if (op === "toggleMls") set.usedMlsComps = fd.get("value") === "true";
  if (op === "toggleMortgage") set.usedMortgageSite = fd.get("value") === "true";
  if (op === "approveAgent") set.agentStatus = "APPROVED";
  if (op === "rejectAgent") set.agentStatus = "REJECTED";
  if (op === "disable" && id !== admin.id) set.disabled = true;
  if (op === "enable") set.disabled = false;
  if (op === "makeAdmin") set.role = "ADMIN";
  if (op === "removeAdmin" && id !== admin.id) set.role = "PLAYER";
  if (Object.keys(set).length) await db.update(schema.users).set(set).where(eq(schema.users.id, id));
  if (op === "disable" && id !== admin.id) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  revalidatePath("/admin/users");
}

export async function markPaidAction(fd: FormData) {
  await requireAdmin();
  const paid = fd.get("paid") === "true";
  await db.update(schema.gameWinners).set({ paid, paidAt: paid ? new Date() : null }).where(eq(schema.gameWinners.id, String(fd.get("id"))));
  revalidatePath("/admin/payouts");
}

export async function saveSettingsAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const vals: Record<string, number> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    const n = Number(fd.get(k));
    if (!Number.isFinite(n) || n < 0) return { error: `Invalid value for ${k}` };
    vals[k] = Math.round(n);
  }
  if (vals.baseGuesses < 1) return { error: "Players need at least 1 guess" };
  if (vals.maxPerHousehold < 1) return { error: "Allow at least 1 player per household" };
  await saveSettings(vals);
  revalidatePath("/", "layout");
  return { ok: "Settings saved" };
}

/** Admin-managed listing agent profiles (for agents who don't have a player account). */
export async function saveListingAgentAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({
    id: z.string().optional(),
    displayName: z.string().trim().min(2).max(80), brokerage: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional().or(z.literal("")),
    website: z.string().trim().max(200).optional(), bio: z.string().trim().max(1000).optional(),
    photoUrl: z.string().trim().max(500).optional(),
    category: z.string().optional(), companyCity: z.string().trim().max(80).optional(), licenseState: z.string().trim().max(2).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { id, ...v } = p.data;
  const website = normalizeUrl(v.website);
  if (v.website && !website) return { error: "Website doesn't look like a web address (e.g. www.linktr.ee/name)" };
  let photoUrl = v.photoUrl ? normalizeUrl(v.photoUrl) : null;
  if (v.photoUrl && !photoUrl) return { error: "Photo URL doesn't look like a web address" };
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try { photoUrl = await saveImage(photo); } catch (e) { return { error: (e as Error).message }; }
  }
  const values = {
    ...v, email: v.email || null, website, photoUrl, category: isProCategory(v.category) ? v.category : "AGENT",
    companyCity: v.companyCity || null, licenseState: v.licenseState?.toUpperCase() || null,
  };
  if (id) {
    if (!photoUrl) delete (values as Record<string, unknown>).photoUrl;
    await db.update(schema.agentProfiles).set(values).where(eq(schema.agentProfiles.id, id));
  } else await db.insert(schema.agentProfiles).values(values);
  revalidatePath("/", "layout");
  return { ok: "Agent saved" };
}

const marketingSchema = z.object({
  subject: z.string().trim().min(3, "Subject is required").max(150),
  message: z.string().trim().min(10, "Message is too short").max(10000),
  mailingAddress: z.string().trim().min(10, "A mailing address is required by law (CAN-SPAM)").max(300),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaUrl: z.string().trim().url().optional().or(z.literal("")),
  mode: z.enum(["test", "all"]),
});

/** Send a promotional email: a test to the admin, or to every player who opted in. */
export async function sendMarketingAction(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = marketingSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  await setTextSetting("mailingAddress", d.mailingAddress);
  const cta = d.ctaLabel && d.ctaUrl ? { label: d.ctaLabel, href: d.ctaUrl } : undefined;
  const recipients = d.mode === "test"
    ? [{ id: admin.id, email: admin.email, firstName: admin.firstName }]
    : await db.select({ id: schema.users.id, email: schema.users.email, firstName: schema.users.firstName })
        .from(schema.users).where(and(eq(schema.users.marketingOptIn, true), eq(schema.users.disabled, false)));
  if (!recipients.length) return { error: "No players have opted in to emails yet." };
  const sent = await sendMarketingEmail(recipients, d.subject, d.message, d.mailingAddress, cta);
  const note = process.env.RESEND_API_KEY ? "" : " (Email service not set up yet, so they were only recorded in the Email Log.)";
  return { ok: d.mode === "test" ? `Test sent to ${admin.email}.${note}` : `Sent to ${sent} of ${recipients.length} players.${note}` };
}
