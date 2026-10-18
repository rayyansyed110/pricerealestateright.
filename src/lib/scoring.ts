type GuessRow = { id: string; userId: string; amount: number; isAgent: boolean; createdAt: Date };

/** Best (closest) guess per user, sorted by accuracy, ties broken by earliest submission. */
export function rankGuesses<T extends GuessRow>(guesses: T[], finalPrice: number) {
  const best = new Map<string, T & { diff: number }>();
  for (const g of guesses) {
    const diff = Math.abs(g.amount - finalPrice);
    const cur = best.get(g.userId);
    if (!cur || diff < cur.diff || (diff === cur.diff && g.createdAt < cur.createdAt)) best.set(g.userId, { ...g, diff });
  }
  return [...best.values()].sort((a, b) => a.diff - b.diff || a.createdAt.getTime() - b.createdAt.getTime());
}
