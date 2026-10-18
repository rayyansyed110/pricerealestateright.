import "server-only";
import { db, schema } from "@/db";

export const DEFAULT_SETTINGS = {
  baseGuesses: 1, // guesses every player gets per game
  mlsBonusGuesses: 1, // extra guesses for users of the MLS comps sister site
  mortgageBonusGuesses: 1, // extra guesses ("additional chance") for PriceMortgageRight users
  gamePrize: 100, // default prize per game (public winner)
  annualPrize: 1000, // annual grand prize for the best public player
  agentGamePrize: 0, // optional prize for best realtor guess per game
  agentAnnualPrize: 0, // optional annual realtor prize
};
export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(schema.settings);
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key in s) (s as Record<string, number>)[r.key] = Number(r.value);
  }
  return s;
}

export async function saveSettings(values: Partial<Settings>) {
  for (const [key, value] of Object.entries(values)) {
    await db.insert(schema.settings).values({ key, value: String(value) })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: String(value) } });
  }
}

export function allowedGuesses(
  s: Settings,
  u: { usedMlsComps: boolean; usedMortgageSite: boolean },
) {
  return s.baseGuesses + (u.usedMlsComps ? s.mlsBonusGuesses : 0) + (u.usedMortgageSite ? s.mortgageBonusGuesses : 0);
}
