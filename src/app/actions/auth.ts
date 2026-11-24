"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  clientIp, createSession, destroyAllSessions, destroySession, getCurrentUser, hashPassword,
  hashToken, isRateLimited, newToken, recordAttempt, verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { householdKey } from "@/lib/household";
import { isProCategory, type ProCategory } from "@/lib/pro";

export type FormState = { error?: string; ok?: string } | undefined;

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");
const password = z.string().min(8, "Password must be at least 8 characters").max(200)
  .regex(/[A-Za-z]/, "Password needs a letter").regex(/[0-9]/, "Password needs a number");

const US_STATE = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use the 2-letter state code (e.g. TX)");

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
  phone: z.string().trim().min(1, "Phone number is required").max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a valid phone number"),
  addressLine1: z.string().trim().min(3, "Street address is required").max(120),
  addressLine2: z.string().trim().max(60).optional(),
  city: z.string().trim().min(2, "City is required").max(80),
  state: US_STATE,
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code"),
  smsConsent: z.literal("on", { errorMap: () => ({ message: "Please agree to receive text messages to create an account" }) }),
  smsGameAlerts: z.literal("on").optional(),
  smsWinNotify: z.literal("on").optional(),
  isPro: z.literal("on").optional(),
  proCategory: z.string().optional(),
  company: z.string().trim().max(120).optional(),
  companyCity: z.string().trim().max(80).optional(),
  companyState: z.string().trim().toUpperCase().max(2).optional(),
  brokerageLeaderboard: z.enum(["yes", "no"]).optional(),
  licenseNumber: z.string().trim().max(60).optional(),
  insider: z.literal("on", { errorMap: () => ({ message: "Please confirm you have no insider information" }) }),
  terms: z.literal("on", { errorMap: () => ({ message: "Please accept the rules & terms" }) }),
});

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (await isRateLimited(`register:${await clientIp()}`, 10)) return { error: "Too many attempts. Please try again later." };

  // Professional details
  let category: ProCategory | null = null;
  if (d.isPro) {
    if (!isProCategory(d.proCategory)) return { error: "Choose your professional category" };
    category = d.proCategory;
    if (!d.company) return { error: category === "AGENT" ? "Brokerage name is required" : "Company name is required" };
    if (!d.companyState || !/^[A-Z]{2}$/.test(d.companyState)) return { error: "Enter your company's 2-letter state code" };
    if (category === "AGENT" && !d.companyCity) return { error: "Brokerage city is required" };
    if (category === "AGENT" && !d.brokerageLeaderboard) return { error: "Choose whether your brokerage joins the Brokerage Leaderboard" };
  }

  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, d.email) });
  if (exists) {
    await recordAttempt(`register:${await clientIp()}`, false);
    return { error: "An account with this email already exists. Try signing in." };
  }

  // Limit players per household (same street address + unit + ZIP)
  const settings = await getSettings();
  const hh = householdKey(d.addressLine1, d.addressLine2, d.zip);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users)
    .where(and(eq(schema.users.householdKey, hh), eq(schema.users.disabled, false)));
  if (n >= settings.maxPerHousehold) {
    await recordAttempt(`register:${await clientIp()}`, false);
    return { error: `Only ${settings.maxPerHousehold} players per household are allowed, and this address already has ${n}. Contact us if you think this is a mistake.` };
  }

  const [user] = await db.insert(schema.users).values({
    email: d.email, passwordHash: await hashPassword(d.password), firstName: d.firstName, lastName: d.lastName,
    phone: d.phone, addressLine1: d.addressLine1, addressLine2: d.addressLine2 || null, city: d.city, state: d.state, zip: d.zip,
    householdKey: hh, smsConsent: true, smsGameAlerts: !!d.smsGameAlerts, smsWinNotify: !!d.smsWinNotify,
    rulesAcceptedAt: new Date(), agentStatus: category ? "PENDING" : "NONE", marketingOptIn: true,
  }).returning();
  if (category) {
    await db.insert(schema.agentProfiles).values({
      userId: user.id, displayName: `${d.firstName} ${d.lastName}`, category, brokerage: d.company!, email: d.email,
      companyCity: d.companyCity || null, licenseState: d.companyState || null, phone: d.phone,
      licenseNumber: d.licenseNumber || null, brokerageLeaderboard: category === "AGENT" && d.brokerageLeaderboard === "yes",
    });
  }
  await createSession(user.id);
  await sendWelcomeEmail(user.email, user.firstName).catch(() => {});
  redirect(safeNext(fd.get("next")));
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const pw = String(fd.get("password") || "");
  if (!email || !pw) return { error: "Enter your email and password" };
  const ip = await clientIp();
  if ((await isRateLimited(`login:${email}`)) || (await isRateLimited(`ip:${ip}`, 20)))
    return { error: "Too many failed attempts. Please wait 15 minutes or reset your password." };

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  const ok = user ? await verifyPassword(pw, user.passwordHash) : await verifyPassword(pw, "$2b$12$4W8kUjvntOMKJeJvhw2zAemSyRwYc.KUmB5RR62gAhRFPznJbTGXa");
  if (!user || !ok || user.disabled) {
    await recordAttempt(`login:${email}`, false);
    await recordAttempt(`ip:${ip}`, false);
    return { error: user?.disabled ? "This account has been disabled." : "Incorrect email or password" };
  }
  await recordAttempt(`login:${email}`, true);
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const msg = { ok: "If an account exists for that email, we've sent a reset link." };
  if (!email) return { error: "Enter your email" };
  if (await isRateLimited(`reset:${await clientIp()}`, 5)) return msg;
  await recordAttempt(`reset:${await clientIp()}`, false); // counts toward the limit
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (user && !user.disabled) {
    const token = newToken();
    await db.insert(schema.passwordResetTokens).values({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 36e5) });
    await sendPasswordResetEmail(user.email, user.firstName, token);
  }
  return msg;
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") || "");
  const pw = password.safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  const row = await db.query.passwordResetTokens.findFirst({
    where: and(eq(schema.passwordResetTokens.tokenHash, hashToken(token)), gt(schema.passwordResetTokens.expiresAt, new Date()), isNull(schema.passwordResetTokens.usedAt)),
  });
  if (!row) return { error: "This reset link is invalid or has expired." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw.data) }).where(eq(schema.users.id, row.userId));
  await db.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.id, row.id));
  await destroyAllSessions(row.userId);
  await createSession(row.userId);
  redirect("/account?reset=1");
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30).optional(),
  marketingOptIn: z.literal("on").optional(),
  smsConsent: z.literal("on").optional(),
  smsGameAlerts: z.literal("on").optional(),
  smsWinNotify: z.literal("on").optional(),
});

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!u) return { error: "Please sign in" };
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const sms = !!p.data.smsConsent;
  await db.update(schema.users).set({
    firstName: p.data.firstName, lastName: p.data.lastName, phone: p.data.phone || null,
    marketingOptIn: !!p.data.marketingOptIn, smsConsent: sms,
    // turning off text consent also turns off the optional text alerts
    smsGameAlerts: sms && !!p.data.smsGameAlerts, smsWinNotify: sms && !!p.data.smsWinNotify,
  }).where(eq(schema.users.id, u.id));
  return { ok: "Profile saved" };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!u) return { error: "Please sign in" };
  if (!(await verifyPassword(String(fd.get("current") || ""), u.passwordHash))) return { error: "Current password is incorrect" };
  const pw = password.safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  await db.update(schema.users).set({ passwordHash: await hashPassword(pw.data) }).where(eq(schema.users.id, u.id));
  await destroyAllSessions(u.id);
  await createSession(u.id);
  return { ok: "Password changed" };
}
