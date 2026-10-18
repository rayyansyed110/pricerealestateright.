import Link from "next/link";
import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { listGames } from "@/lib/game";
import { money } from "@/lib/format";

const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
const n = sql<number>`count(*)::int`;

export default async function AdminHome() {
  const now = new Date();
  const [users, agentsPending, videosPending, unpaid, active, pending] = await Promise.all([
    count(db.select({ n }).from(schema.users)),
    count(db.select({ n }).from(schema.users).where(eq(schema.users.agentStatus, "PENDING"))),
    count(db.select({ n }).from(schema.videos).where(eq(schema.videos.approved, false))),
    db.select({ n, total: sql<number>`coalesce(sum(${schema.gameWinners.prizeAmount}),0)::int` }).from(schema.gameWinners).where(and(eq(schema.gameWinners.paid, false), gt(schema.gameWinners.prizeAmount, 0))),
    listGames("active", true),
    db.select().from(schema.games).where(and(lte(schema.games.closesAt, now), isNull(schema.games.finalSalePrice))),
  ]);
  const cards = [
    ["Registered users", users, "/admin/users"],
    ["Active games", active.length, "/admin/games"],
    ["Awaiting final sale price", pending.length, "/admin/games"],
    ["Realtors to approve", agentsPending, "/admin/users?filter=pending"],
    ["Videos to approve", videosPending, "/admin/videos"],
    [`Unpaid prizes (${money(unpaid[0]?.total ?? 0)})`, unpaid[0]?.n ?? 0, "/admin/payouts"],
  ] as const;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Dashboard</h1><Link href="/admin/games/new" className="btn-green">+ New game</Link></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([l, v, h]) => <Link key={l} href={h} className="card p-5 hover:ring-blue-300"><div className="text-sm text-slate-500">{l}</div><div className="mt-1 text-3xl font-black text-navy-900">{v}</div></Link>)}
      </div>
      {pending.length > 0 && (
        <section className="card p-5">
          <h2 className="font-bold">Homes waiting for the sale to close</h2>
          <p className="text-sm text-slate-500">When a sale closes and the price is public, open the game and enter the final sale price to pick the winner and send emails.</p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {pending.map((g) => <li key={g.id} className="flex justify-between py-2"><span>{g.address}, {g.city}</span><Link href={`/admin/games/${g.id}#close`} className="font-semibold text-blue-600">Enter sale price →</Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
