"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isApprovedAgent } from "@/lib/auth";
import { saveImage } from "@/lib/uploads";
import type { FormState } from "./auth";

const profile = z.object({
  displayName: z.string().trim().min(2).max(80),
  brokerage: z.string().trim().min(2, "Brokerage is required").max(120),
  licenseNumber: z.string().trim().max(60).optional(),
  licenseState: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(30).optional(),
  website: z.string().trim().url().max(200).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional(),
});

/** Create / update the logged-in user's agent profile (applying makes status PENDING until admin approves). */
export async function saveAgentProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!u) return { error: "Please sign in" };
  const p = profile.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  let photoUrl = u.agentProfile?.photoUrl ?? null;
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try { photoUrl = await saveImage(photo); } catch (e) { return { error: (e as Error).message }; }
  }
  const values = { ...p.data, website: p.data.website || null, email: u.email, photoUrl };
  if (u.agentProfile) await db.update(schema.agentProfiles).set(values).where(eq(schema.agentProfiles.id, u.agentProfile.id));
  else await db.insert(schema.agentProfiles).values({ ...values, userId: u.id });
  if (u.agentStatus === "NONE" || u.agentStatus === "REJECTED") {
    await db.update(schema.users).set({ agentStatus: "PENDING" }).where(eq(schema.users.id, u.id));
  }
  revalidatePath("/realtor-hub");
  return { ok: u.agentStatus === "APPROVED" ? "Profile saved" : "Thanks! Your realtor application is pending admin review." };
}

const videoSchema = z.object({
  gameId: z.string().min(1),
  type: z.enum(["AGENT_PROMO", "WALKTHROUGH", "CLOSING"]),
  title: z.string().trim().min(3).max(120),
  url: z.string().trim().url("Enter a valid YouTube, Vimeo or .mp4 link"),
  description: z.string().trim().max(600).optional(),
});

/** Approved agents submit a video for a game; it shows once an admin approves it. */
export async function submitVideoAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!isApprovedAgent(u)) return { error: "Only approved realtors can post videos." };
  const p = videoSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!/^https:\/\//.test(p.data.url)) return { error: "Video link must start with https://" };
  if (/\$\s?\d|\bprice\b/i.test(`${p.data.title} ${p.data.description ?? ""}`))
    return { error: "Please don't mention price in the video title or description." };
  await db.insert(schema.videos).values({ ...p.data, agentId: u!.agentProfile!.id, approved: false });
  revalidatePath("/realtor-hub");
  return { ok: "Video submitted! It will appear on the game once approved (videos must not mention the price)." };
}
