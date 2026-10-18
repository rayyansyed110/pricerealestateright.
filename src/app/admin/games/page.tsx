import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { gameStatus, listGames } from "@/lib/game";
import { fmtDateTime, money } from "@/lib/format";
import { StatusPill } from "@/components/GameCard";

export default async function AdminGames() {
  const games = await listGames("all", true);
  const counts = await db.select({ id: schema.guesses.gameId, n: sql<number>`count(*)::int` }).from(schema.guesses).groupBy(schema.guesses.gameId);
  const c = new Map(counts.map((x) => [x.id, x.n]));
  games.sort((a, b) => b.opensAt.getTime() - a.opensAt.getTime());
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Games / Listings</h1><Link href="/admin/games/new" className="btn-green">+ New game</Link></div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Home</th><th>Status</th><th>List</th><th>Sold</th><th>Guesses</th><th>Window</th><th></th></tr></thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id}>
                <td><div className="font-semibold">{g.address}</div><div className="text-xs text-slate-500">{g.city}, {g.state} {!g.published && "· unpublished"}</div></td>
                <td><StatusPill status={gameStatus(g)} /></td>
                <td>{money(g.listPrice)}</td><td>{money(g.finalSalePrice)}</td><td>{c.get(g.id) ?? 0}</td>
                <td className="text-xs">{fmtDateTime(g.opensAt)}<br />→ {fmtDateTime(g.closesAt)}</td>
                <td className="whitespace-nowrap"><Link href={`/admin/games/${g.id}`} className="btn-outline btn-sm">Manage</Link> <Link href={`/games/${g.slug}`} className="btn-outline btn-sm">View</Link></td>
              </tr>
            ))}
            {!games.length && <tr><td colSpan={7} className="py-8 text-center text-slate-500">No games yet. Create your first listing!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
