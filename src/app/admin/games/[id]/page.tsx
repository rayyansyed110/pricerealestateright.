import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db, schema } from "@/db";
import { gameStatus } from "@/lib/game";
import { fmtDateTime, money, TZ } from "@/lib/format";
import { VIDEO_LABELS } from "@/lib/video";
import { AddVideoForm, CloseGameForm, GameForm } from "@/components/AdminForms";
import { ConfirmButton } from "@/components/ui";
import { StatusPill } from "@/components/GameCard";
import {
  deleteGameAction, deleteGuessAction, deletePhotoAction, makeCoverPhotoAction, reopenGameAction, setVideoApprovalAction,
} from "@/app/actions/admin";

export default async function ManageGame({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const g = await db.query.games.findFirst({
    where: eq(schema.games.id, id),
    with: { photos: { orderBy: asc(schema.photos.sortOrder) }, videos: { with: { agent: true } }, winners: { with: { user: true } } },
  });
  if (!g) notFound();
  const [agents, guesses] = await Promise.all([
    db.query.agentProfiles.findMany(),
    db.query.guesses.findMany({ where: eq(schema.guesses.gameId, id), with: { user: true }, orderBy: desc(schema.guesses.createdAt) }),
  ]);
  const status = gameStatus(g);
  const f = (d: Date | null) => (d ? formatInTimeZone(d, TZ, "yyyy-MM-dd'T'HH:mm") : null);
  const agentOpts = agents.map((a) => ({ id: a.id, label: `${a.displayName} — ${a.brokerage}` }));

  return (
    <div className="space-y-6">
      {sp.created && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Game created! Add more photos or videos below.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/admin/games" className="text-sm text-blue-600">← All games</Link><h1 className="text-2xl font-extrabold">{g.address}, {g.city}</h1></div>
        <div className="flex items-center gap-2"><StatusPill status={status} /><Link href={`/games/${g.slug}`} className="btn-outline btn-sm">View public page</Link></div>
      </div>

      {(status === "PENDING" || status === "CLOSED") && (
        <section id="close" className="card border-l-4 border-green-500 p-5">
          <h2 className="text-lg font-bold">{status === "CLOSED" ? "Result" : "Home closed? Enter the final sale price"}</h2>
          <p className="mb-3 text-sm text-slate-500">The closest public guess wins {money(g.prizeAmount)}; the closest realtor tops the Realtor Leaderboard for this game. {g.resultsSentAt && `Result emails sent ${fmtDateTime(g.resultsSentAt)}.`}</p>
          <CloseGameForm key={`${g.finalSalePrice}-${g.resultsSentAt?.getTime()}`} id={g.id} current={g.finalSalePrice} emailed={!!g.resultsSentAt} />
          {g.winners.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {g.winners.map((w) => <li key={w.id}>🏆 {w.isAgent ? "Realtor" : "Public"} winner: <b>{w.user.firstName} {w.user.lastName}</b> ({w.user.email}) — off by {money(w.difference)}</li>)}
            </ul>
          )}
          {status === "CLOSED" && <form action={reopenGameAction} className="mt-3"><input type="hidden" name="id" value={g.id} /><ConfirmButton message="Remove the result and winners? (Emails already sent can't be unsent.)" className="btn-outline btn-sm">Undo result</ConfirmButton></form>}
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold">Listing & timeline</h2>
        <GameForm tzLabel={TZ} agents={agentOpts} g={{ ...g, lastSoldDate: g.lastSoldDate ? formatInTimeZone(g.lastSoldDate, TZ, "yyyy-MM-dd") : null, opensAt: f(g.opensAt), closesAt: f(g.closesAt), photos: null, videos: null, winners: null, saleClosedAt: null, resultsSentAt: null, createdAt: null } as never} />
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-bold">Photos ({g.photos.length})</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {g.photos.map((p, i) => (
            <div key={p.id} className="overflow-hidden rounded-lg ring-1 ring-slate-200">
              <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between p-2">
                {i === 0 ? <span className="pill bg-green-100 text-green-700">Cover</span> : <form action={makeCoverPhotoAction}><input type="hidden" name="id" value={p.id} /><button className="text-xs text-blue-600">Make cover</button></form>}
                <form action={deletePhotoAction}><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Delete this photo?" className="text-xs text-red-600">Delete</ConfirmButton></form>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Add more photos using the form above.</p>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-bold">Videos</h2>
        <p className="mb-3 text-sm text-slate-500">The game page layout changes based on videos: Agent promo → walkthrough → closing video (shown only after the game is closed). With no videos, the Agent Info card is shown.</p>
        <ul className="mb-4 divide-y divide-slate-100 text-sm">
          {g.videos.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><b>{v.title}</b> · {VIDEO_LABELS[v.type]} {v.agent && `· ${v.agent.displayName}`} · <a href={v.url} target="_blank" rel="noopener" className="text-blue-600 underline">link</a></span>
              <span className="flex gap-2">
                <span className={`pill ${v.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{v.approved ? "Live" : "Pending"}</span>
                <form action={setVideoApprovalAction}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="op" value={v.approved ? "unapprove" : "approve"} /><button className="btn-outline btn-sm">{v.approved ? "Hide" : "Approve"}</button></form>
                <form action={setVideoApprovalAction}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="op" value="delete" /><ConfirmButton message="Delete video?">Delete</ConfirmButton></form>
              </span>
            </li>
          ))}
          {!g.videos.length && <li className="py-2 text-slate-500">No videos yet.</li>}
        </ul>
        <AddVideoForm gameId={g.id} agents={agentOpts} />
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-bold">Guesses ({guesses.length})</h2>
        <div className="max-h-96 overflow-auto">
          <table className="table">
            <thead><tr><th>Player</th><th>Type</th><th>Guess</th>{g.finalSalePrice != null && <th>Off by</th>}<th>Placed</th><th></th></tr></thead>
            <tbody>
              {guesses.map((x) => (
                <tr key={x.id}>
                  <td>{x.user.firstName} {x.user.lastName}<div className="text-xs text-slate-500">{x.user.email}</div></td>
                  <td>{x.isAgent ? "Realtor" : "Public"}</td>
                  <td className="font-semibold">{money(x.amount)}</td>
                  {g.finalSalePrice != null && <td>{money(Math.abs(x.amount - g.finalSalePrice))}</td>}
                  <td className="text-xs">{fmtDateTime(x.createdAt)}</td>
                  <td><form action={deleteGuessAction}><input type="hidden" name="id" value={x.id} /><ConfirmButton message="Remove this guess (e.g. for cheating)?" className="text-xs text-red-600">Remove</ConfirmButton></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card border border-red-200 p-6">
        <h2 className="font-bold text-red-700">Danger zone</h2>
        <form action={deleteGameAction} className="mt-2"><input type="hidden" name="id" value={g.id} /><ConfirmButton message="Permanently delete this game, its photos, videos and all guesses?">Delete game</ConfirmButton></form>
      </section>
    </div>
  );
}
