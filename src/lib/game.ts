import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { db, schema } from "@/db";
import type { Game } from "@/db/schema";
import { TZ } from "./format";
import { getSettings } from "./settings";
import { sendResultEmails } from "./email";
import { rankGuesses } from "./scoring";

export type GameStatus = "UPCOMING" | "OPEN" | "PENDING" | "CLOSED";

/** UPCOMING → OPEN (guessing week) → PENDING (waiting for the sale to close) → CLOSED (winner picked) */
export function gameStatus(g: Pick<Game, "opensAt" | "closesAt" | "finalSalePrice">, now = new Date()): GameStatus {
  if (g.finalSalePrice != null) return "CLOSED";
  if (now < g.opensAt) return "UPCOMING";
  if (now < g.closesAt) return "OPEN";
  return "PENDING";
}

export const STATUS_LABEL: Record<GameStatus, string> = {
  UPCOMING: "Coming Soon",
  OPEN: "Open for Guesses",
  PENDING: "Pending Sale",
  CLOSED: "Closed & Sold",
};

/** The weekly window that contains `from` (or the next one): Saturday 3:00 AM → Friday 11:59 PM, game timezone. */
export function weeklyWindow(from = new Date(), next = false) {
  const z = toZonedTime(from, TZ);
  const day = z.getDay(); // 0 Sun .. 6 Sat
  let back = (day + 1) % 7; // days since Saturday
  if (day === 6 && z.getHours() < 3) back = 7;
  const sat = new Date(z.getFullYear(), z.getMonth(), z.getDate() - back + (next ? 7 : 0), 3, 0, 0);
  const fri = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 6, 23, 59, 0);
  return { opensAt: fromZonedTime(sat, TZ), closesAt: fromZonedTime(fri, TZ) };
}

// ---------- Queries ----------
export async function listGames(filter: "active" | "pending" | "closed" | "upcoming" | "all", includeUnpublished = false) {
  const now = new Date();
  const conds = [];
  if (!includeUnpublished) conds.push(eq(schema.games.published, true));
  if (filter === "active") conds.push(lte(schema.games.opensAt, now), gte(schema.games.closesAt, now), sql`${schema.games.finalSalePrice} is null`);
  if (filter === "upcoming") conds.push(gte(schema.games.opensAt, now));
  if (filter === "pending") conds.push(lte(schema.games.closesAt, now), sql`${schema.games.finalSalePrice} is null`);
  if (filter === "closed") conds.push(isNotNull(schema.games.finalSalePrice));
  return db.query.games.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: filter === "closed" ? desc(schema.games.saleClosedAt) : asc(schema.games.closesAt),
    with: {
      photos: { orderBy: asc(schema.photos.sortOrder) },
      videos: { where: eq(schema.videos.approved, true) },
      listingAgent: true,
    },
  });
}

export async function getGameBySlug(slug: string) {
  return db.query.games.findFirst({
    where: eq(schema.games.slug, slug),
    with: {
      photos: { orderBy: asc(schema.photos.sortOrder) },
      videos: { where: eq(schema.videos.approved, true), with: { agent: true } },
      listingAgent: true,
      winners: { with: { user: true } },
    },
  });
}

export async function guessCount(gameId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.guesses).where(eq(schema.guesses.gameId, gameId));
  return r?.n ?? 0;
}

// ---------- Scoring ----------
export { rankGuesses };

/**
 * Admin enters the final (public record) sale price → winners are picked for the
 * public ladder and the realtor ladder, and result emails go out once.
 */
export async function closeGame(gameId: string, finalPrice: number, opts: { sendEmails: boolean }) {
  const settings = await getSettings();
  const game = await db.query.games.findFirst({ where: eq(schema.games.id, gameId) });
  if (!game) throw new Error("Game not found");

  await db.update(schema.games).set({ finalSalePrice: finalPrice, saleClosedAt: game.saleClosedAt ?? new Date() }).where(eq(schema.games.id, gameId));

  const all = await db.select().from(schema.guesses).where(eq(schema.guesses.gameId, gameId));
  const pub = rankGuesses(all.filter((g) => !g.isAgent), finalPrice);
  const agents = rankGuesses(all.filter((g) => g.isAgent), finalPrice);

  await db.delete(schema.gameWinners).where(eq(schema.gameWinners.gameId, gameId));
  const winnerIds = new Set<string>();
  if (pub[0]) {
    winnerIds.add(pub[0].userId);
    await db.insert(schema.gameWinners).values({ gameId, userId: pub[0].userId, guessId: pub[0].id, isAgent: false, difference: pub[0].diff, prizeAmount: game.prizeAmount });
  }
  if (agents[0]) {
    winnerIds.add(agents[0].userId);
    await db.insert(schema.gameWinners).values({ gameId, userId: agents[0].userId, guessId: agents[0].id, isAgent: true, difference: agents[0].diff, prizeAmount: settings.agentGamePrize });
  }

  let sent = 0;
  if (opts.sendEmails) {
    const ranked = [...pub, ...agents];
    const users = ranked.length
      ? await db.select().from(schema.users).where(inArray(schema.users.id, ranked.map((r) => r.userId)))
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    const recipients = ranked.flatMap((r) => {
      const u = byId.get(r.userId);
      if (!u) return [];
      const type = winnerIds.has(r.userId) ? "WON" : r.amount >= finalPrice ? "OVERBID" : "UNDERBID";
      return [{ user: u, guess: r.amount, type: type as "WON" | "OVERBID" | "UNDERBID", isAgent: r.isAgent }];
    });
    sent = await sendResultEmails({ ...game, finalSalePrice: finalPrice }, recipients);
    await db.update(schema.games).set({ resultsSentAt: new Date() }).where(eq(schema.games.id, gameId));
  }
  return { publicWinner: pub[0], agentWinner: agents[0], emailsSent: sent };
}

// ---------- Leaderboards ----------
export type LadderRow = {
  userId: string; name: string; city: string | null; brokerage?: string | null;
  points: number; wins: number; played: number; top3: number; avgErrorPct: number; streak: number;
};

const PLACE_POINTS = [10, 7, 5, 3, 3, 2, 2, 2, 2, 2]; // + 1 point for every finished game played

/** Season ladder for one category. Points: 1st=10, 2nd=7, 3rd=5, 4-5=3, 6-10=2, +1 per game played. */
export async function ladder(isAgent: boolean, year = new Date().getFullYear()): Promise<LadderRow[]> {
  const start = fromZonedTime(new Date(year, 0, 1), TZ);
  const end = fromZonedTime(new Date(year + 1, 0, 1), TZ);
  const closed = await db.select().from(schema.games).where(and(isNotNull(schema.games.finalSalePrice), gte(schema.games.saleClosedAt, start), lte(schema.games.saleClosedAt, end))).orderBy(asc(schema.games.saleClosedAt));
  if (!closed.length) return [];
  const gs = await db.select().from(schema.guesses).where(and(inArray(schema.guesses.gameId, closed.map((g) => g.id)), eq(schema.guesses.isAgent, isAgent)));
  const stats = new Map<string, { points: number; wins: number; played: number; top3: number; errSum: number; streak: number; cur: number }>();
  for (const game of closed) {
    const ranked = rankGuesses(gs.filter((g) => g.gameId === game.id), game.finalSalePrice!);
    const placed = new Set<string>();
    ranked.forEach((r, i) => {
      placed.add(r.userId);
      const s = stats.get(r.userId) ?? { points: 0, wins: 0, played: 0, top3: 0, errSum: 0, streak: 0, cur: 0 };
      s.played++;
      s.points += 1 + (PLACE_POINTS[i] ?? 0);
      if (i === 0) s.wins++;
      if (i < 3) s.top3++;
      const pct = (r.diff / game.finalSalePrice!) * 100;
      s.errSum += pct;
      // "Accurate guess streak": consecutive played games within 5% of the final sale price
      s.cur = pct <= 5 ? s.cur + 1 : 0;
      s.streak = Math.max(s.streak, s.cur);
      stats.set(r.userId, s);
    });
  }
  if (!stats.size) return [];
  const us = await db.query.users.findMany({ where: inArray(schema.users.id, [...stats.keys()]), with: { agentProfile: true } });
  return us
    .filter((u) => !u.disabled)
    .map((u) => {
      const s = stats.get(u.id)!;
      return {
        userId: u.id,
        name: isAgent && u.agentProfile ? u.agentProfile.displayName : `${u.firstName} ${u.lastName.charAt(0)}.`,
        city: u.city,
        brokerage: u.agentProfile?.brokerage,
        points: s.points, wins: s.wins, played: s.played, top3: s.top3, streak: s.streak,
        avgErrorPct: s.errSum / s.played,
      };
    })
    .sort((a, b) => b.points - a.points || a.avgErrorPct - b.avgErrorPct);
}

/** Quick stats for an agent card: guesses made and win rate. */
export async function agentQuickStats(agentProfileId: string) {
  const prof = await db.query.agentProfiles.findFirst({ where: eq(schema.agentProfiles.id, agentProfileId) });
  if (!prof?.userId) return null;
  const [g] = await db.select({ n: sql<number>`count(distinct ${schema.guesses.gameId})::int` }).from(schema.guesses).where(eq(schema.guesses.userId, prof.userId));
  const [w] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.gameWinners).where(eq(schema.gameWinners.userId, prof.userId));
  const games = g?.n ?? 0;
  return { games, wins: w?.n ?? 0, winRate: games ? Math.round(((w?.n ?? 0) / games) * 100) : 0 };
}
