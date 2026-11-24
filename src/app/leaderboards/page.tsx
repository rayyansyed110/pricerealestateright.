import Link from "next/link";
import { brokerageLadder, ladder, type BrokerageRow } from "@/lib/game";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboards" };

export default async function Leaderboards({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const thisYear = new Date().getFullYear();
  const y = Number((await searchParams).year) || thisYear;
  const [pub, agents, s] = await Promise.all([ladder(false, y), ladder(true, y), getSettings()]);
  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="h-section">{y} Leaderboards</h1>
        <div className="flex gap-2">{[thisYear, thisYear - 1].map((yy) => <Link key={yy} href={`/leaderboards?year=${yy}`} className={yy === y ? "btn-navy btn-sm" : "btn-outline btn-sm"}>{yy}</Link>)}</div>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <Board title="Public Ladder" subtitle={`#1 at year end wins the ${money(s.annualPrize)} Annual Grand Prize`} rows={pub} />
        <Board title="Pro Leaderboard" subtitle="Real estate professionals competing for bragging rights" rows={agents} agent />
      </div>
      <div className="mt-8"><BrokerageBoard rows={brokerageLadder(agents)} /></div>
    </div>
  );
}

function Board({ title, subtitle, rows, agent }: { title: string; subtitle: string; rows: Awaited<ReturnType<typeof ladder>>; agent?: boolean }) {
  return (
    <section className="card overflow-hidden">
      <div className="bg-navy-900 p-4 text-white"><h2 className="text-xl font-bold">{title}</h2><p className="text-sm text-slate-300">{subtitle}</p></div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>{agent ? "Agent" : "Player"}</th><th>Points</th><th>Wins</th><th>Top 3</th><th>Played</th><th>Avg error</th><th>Best streak</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className={i === 0 ? "bg-amber-50" : ""}>
                <td className="font-bold">{i + 1}</td>
                <td><div className="font-semibold">{r.name}</div><div className="text-xs text-slate-500">{agent ? r.brokerage : r.city}</div></td>
                <td className="font-bold">{r.points}</td><td>{r.wins}</td><td>{r.top3}</td><td>{r.played}</td>
                <td>{r.avgErrorPct.toFixed(1)}%</td><td>{r.streak ? `⭐ ${r.streak}` : "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="py-8 text-center text-slate-500">No finished games yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BrokerageBoard({ rows }: { rows: BrokerageRow[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="bg-navy-900 p-4 text-white"><h2 className="text-xl font-bold">Brokerage Leaderboard</h2><p className="text-sm text-slate-300">Combined points of agents whose brokerage opted in</p></div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>Brokerage</th><th>Agents</th><th>Points</th><th>Wins</th><th>Avg error</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className={i === 0 ? "bg-amber-50" : ""}>
                <td className="font-bold">{i + 1}</td>
                <td><div className="font-semibold">{r.name}</div>{r.state && <div className="text-xs text-slate-500">{r.state}</div>}</td>
                <td>{r.agents}</td><td className="font-bold">{r.points}</td><td>{r.wins}</td><td>{r.avgErrorPct.toFixed(1)}%</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No brokerages on the board yet. Agents can opt in from the Pro Hub.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
