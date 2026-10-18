"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  clientIp, createSession, destroyAllSessions, destroySession, getCurrentUser, hashPassword,
  hashToken, isRateLimited, newToken, recordAttempt, verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";

export type FormState = { error?: string; ok?: string } | undefined;

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");
const password = z.string().min(8, "Password must be at least 8 characters").max(200)
  .regex(/[A-Za-z]/, "Password needs a letter").regex(/[0-9]/, "Password needs a number");

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  isAgent: z.literal("on").optional(),
  brokerage: z.string().trim().max(120).optional(),
  licenseNumber: z.string().trim().max(60).optional(),
  licenseState: z.string().trim().max(30).optional(),
  terms: z.literal("on", { errorMap: () => ({ message: "Please accept the rules & terms" }) }),
});

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (await isRateLimited(`register:${await clientIp()}`, 10)) return { error: "Too many attempts. Please try again later." };

  if (d.isAgent && !d.brokerage) return { error: "Brokerage is required for real estate agents" };
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, d.email) });
  if (exists) {
    await recordAttempt(`register:${await clientIp()}`, false);
    return { error: "An account with this email already exists. Try signing in." };
  }
  const [user] = await db.insert(schema.users).values({
    email: d.email, passwordHash: await hashPassword(d.password), firstName: d.firstName, lastName: d.lastName,
    phone: d.phone || null, city: d.city || null, agentStatus: d.isAgent ? "PENDING" : "NONE",
  }).returning();
  if (d.isAgent) {
    await db.insert(schema.agentProfiles).values({
      userId: user.id, displayName: `${d.firstName} ${d.lastName}`, brokerage: d.brokerage!, email: d.email,
      phone: d.phone || null, licenseNumber: d.licenseNumber || null, licenseState: d.licenseState || null,
    });
  }
  await createSession(user.id);
  sendWelcomeEmail(user.email, user.firstName).catch(() => {});
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
  city: z.string().trim().max(80).optional(),
  marketingOptIn: z.literal("on").optional(),
});

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!u) return { error: "Please sign in" };
  const p = profileSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  await db.update(schema.users).set({ ...p.data, phone: p.data.phone || null, city: p.data.city || null, marketingOptIn: !!p.data.marketingOptIn }).where(eq(schema.users.id, u.id));
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
