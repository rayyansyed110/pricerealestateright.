import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SessionUser } from "./auth";
import { allowedGuesses, type Settings } from "./settings";

/** guesses used per game for a user, and guess totals per game */
export async function guessInfo(gameIds: string[], user: SessionUser | null, settings: Settings) {
  const allowed = user ? allowedGuesses(settings, user) : settings.baseGuesses;
  const used = new Map<string, number>();
  const totals = new Map<string, number>();
  if (gameIds.length) {
    const rows = await db.select({ gameId: schema.guesses.gameId, n: sql<number>`count(*)::int` }).from(schema.guesses).where(inArray(schema.guesses.gameId, gameIds)).groupBy(schema.guesses.gameId);
    rows.forEach((r) => totals.set(r.gameId, r.n));
    if (user) {
      const mine = await db.select({ gameId: schema.guesses.gameId, n: sql<number>`count(*)::int` }).from(schema.guesses)
        .where(and(inArray(schema.guesses.gameId, gameIds), eq(schema.guesses.userId, user.id))).groupBy(schema.guesses.gameId);
      mine.forEach((r) => used.set(r.gameId, r.n));
    }
  }
  return { allowed, remaining: (id: string) => Math.max(0, allowed - (used.get(id) ?? 0)), total: (id: string) => totals.get(id) ?? 0 };
}
