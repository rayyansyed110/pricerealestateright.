"use server";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isApprovedAgent } from "@/lib/auth";
import { gameStatus } from "@/lib/game";
import { allowedGuesses, getSettings } from "@/lib/settings";
import type { FormState } from "./auth";

export async function submitGuessAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to place a guess." };
  const gameId = String(fd.get("gameId") || "");
  const amount = Math.round(Number(String(fd.get("amount") || "").replace(/[$,\s]/g, "")));
  if (!Number.isFinite(amount) || amount < 1000 || amount > 1_000_000_000) return { error: "Enter a valid price" };

  const game = await db.query.games.findFirst({ where: eq(schema.games.id, gameId) });
  if (!game || !game.published) return { error: "Game not found" };
  if (gameStatus(game) !== "OPEN") return { error: "Guessing is closed for this home." };

  const settings = await getSettings();
  const allowed = allowedGuesses(settings, user);
  // serialize per user+game to prevent double-submits past the limit
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id + gameId}))`);
    const [c] = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.guesses)
      .where(and(eq(schema.guesses.gameId, gameId), eq(schema.guesses.userId, user.id)));
    if ((c?.n ?? 0) >= allowed) return { error: `You've used all ${allowed} of your guesses for this home.` };
    await tx.insert(schema.guesses).values({ gameId, userId: user.id, amount, isAgent: isApprovedAgent(user) });
    revalidatePath(`/games/${game.slug}`);
    const left = allowed - (c?.n ?? 0) - 1;
    return { ok: `Guess of $${amount.toLocaleString()} locked in!${left > 0 ? ` You have ${left} more guess${left > 1 ? "es" : ""}.` : ""}` };
  });
}
