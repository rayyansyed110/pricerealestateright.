import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listGames } from "@/lib/game";
import { getSettings } from "@/lib/settings";
import { guessInfo } from "@/lib/player";
import { GameCard } from "@/components/GameCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Current Games" };

const TABS = [
  { k: "active", label: "Open Now" },
  { k: "upcoming", label: "Coming Soon" },
  { k: "pending", label: "Pending Sale" },
  { k: "closed", label: "Closed & Sold" },
] as const;

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.k === sp.tab)?.k ?? "active") as (typeof TABS)[number]["k"];
  const [user, settings, games] = await Promise.all([getCurrentUser(), getSettings(), listGames(tab)]);
  const info = await guessInfo(games.map((g) => g.id), user, settings);
  return (
    <div className="container-x py-10">
      <h1 className="h-section">Games</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => <Link key={t.k} href={`/games?tab=${t.k}`} className={tab === t.k ? "btn-navy btn-sm" : "btn-outline btn-sm"}>{t.label}</Link>)}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {games.map((g) => <GameCard key={g.id} game={g} signedIn={!!user} remaining={info.remaining(g.id)} allowed={info.allowed} guessCount={info.total(g.id)} />)}
        {!games.length && <div className="card col-span-full p-10 text-center text-slate-500">No games here right now.</div>}
      </div>
    </div>
  );
}
