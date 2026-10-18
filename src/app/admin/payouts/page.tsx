import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ladder } from "@/lib/game";
import { getSettings } from "@/lib/settings";
import { fmtDate, money } from "@/lib/format";
import { markPaidAction } from "@/app/actions/admin";

export default async function Payouts() {
  const y = new Date().getFullYear();
  const [wins, s, pubNow, pubLast, agNow] = await Promise.all([
    db.query.gameWinners.findMany({ with: { user: true, game: true }, orderBy: desc(schema.gameWinners.createdAt), limit: 300 }),
    getSettings(), ladder(false, y), ladder(false, y - 1), ladder(true, y),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Winners & Payouts</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Leader title={`${y} annual leader (so far)`} r={pubNow[0]} prize={s.annualPrize} />
        <Leader title={`${y - 1} annual winner`} r={pubLast[0]} prize={s.annualPrize} />
        <Leader title={`${y} top realtor (so far)`} r={agNow[0]} prize={s.agentAnnualPrize} />
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Game</th><th>Winner</th><th>Category</th><th>Off by</th><th>Prize</th><th>Status</th></tr></thead>
          <tbody>
            {wins.map((w) => (
              <tr key={w.id}>
                <td>{w.game.address}<div className="text-xs text-slate-500">Sold {money(w.game.finalSalePrice)} · {fmtDate(w.game.saleClosedAt)}</div></td>
                <td>{w.user.firstName} {w.user.lastName}<div className="text-xs text-slate-500">{w.user.email} {w.user.phone && `· ${w.user.phone}`}</div></td>
                <td>{w.isAgent ? "Realtor" : "Public"}</td>
                <td>{money(w.difference)}</td>
                <td className="font-semibold">{money(w.prizeAmount)}</td>
                <td>{w.prizeAmount > 0 ? (
                  <form action={markPaidAction}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="paid" value={String(!w.paid)} />
                    <button className={w.paid ? "btn-green btn-sm" : "btn-outline btn-sm"}>{w.paid ? `Paid ${fmtDate(w.paidAt)}` : "Mark paid"}</button></form>
                ) : "—"}</td>
              </tr>
            ))}
            {!wins.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No winners yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Leader({ title, r, prize }: { title: string; r?: Awaited<ReturnType<typeof ladder>>[number]; prize: number }) {
  return <div className="card p-4"><div className="text-xs uppercase text-slate-500">{title}</div><div className="mt-1 text-lg font-bold">{r ? r.name : "—"}</div>{r && <div className="text-sm text-slate-600">{r.points} pts · {r.wins} wins</div>}{prize > 0 && <div className="text-sm font-semibold text-green-700">Prize {money(prize)}</div>}</div>;
}
