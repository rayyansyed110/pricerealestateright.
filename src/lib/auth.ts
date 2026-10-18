import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const COOKIE = "prer_session";
const SESSION_DAYS = 30;

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(schema.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
  jar.delete(COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

export type SessionUser = typeof schema.users.$inferSelect & {
  agentProfile: typeof schema.agentProfiles.$inferSelect | null;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.query.sessions.findFirst({
    where: and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())),
  });
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
    with: { agentProfile: true },
  });
  if (!user || user.disabled) return null;
  return user as SessionUser;
});

export async function requireUser(next = "/") {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}
export async function requireAdmin() {
  const u = await getCurrentUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}
export const isApprovedAgent = (u: SessionUser | null) =>
  !!u && u.agentStatus === "APPROVED" && !!u.agentProfile;

// ---- Brute-force protection ----
const WINDOW_MIN = 15;
const MAX_FAILS = 5;

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

export async function isRateLimited(key: string, max = MAX_FAILS) {
  const since = new Date(Date.now() - WINDOW_MIN * 60e3);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.key, key), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  return (row?.n ?? 0) >= max;
}
export async function recordAttempt(key: string, success: boolean) {
  await db.insert(schema.loginAttempts).values({ key, success });
}
