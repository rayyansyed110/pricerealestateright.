import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { gameStatus } from "@/lib/game";
import { allowedGuesses, getSettings } from "@/lib/settings";
import { fmtDateTime, money } from "@/lib/format";
import { PasswordForm, ProfileForm } from "@/components/AuthForms";
import { StatusPill } from "@/components/GameCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const u = await requireUser("/account");
  const sp = await searchParams;
  const [settings, mine, wins] = await Promise.all([
    getSettings(),
    db.query.guesses.findMany({ where: eq(schema.guesses.userId, u.id), orderBy: desc(schema.guesses.createdAt), with: { game: true }, limit: 100 }),
    db.query.gameWinners.findMany({ where: eq(schema.gameWinners.userId, u.id), with: { game: true } }),
  ]);
  return (
    <div className="container-x py-10">
      <h1 className="h-section">My Account</h1>
      {sp.reset && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">Your password was reset.</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="text-lg font-bold">My Guesses</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="table">
                <thead><tr><th>Home</th><th>Status</th><th>My guess</th><th>Sold for</th><th>Placed</th></tr></thead>
                <tbody>
                  {mine.map((g) => (
                    <tr key={g.id}>
                      <td><Link href={`/games/${g.game.slug}`} className="font-semibold text-blue-600 hover:underline">{g.game.address}</Link><div className="text-xs text-slate-500">{g.game.city}, {g.game.state}</div></td>
                      <td><StatusPill status={gameStatus(g.game)} /></td>
                      <td className="font-semibold">{money(g.amount)}</td>
                      <td>{money(g.game.finalSalePrice)}</td>
                      <td className="text-xs text-slate-500">{fmtDateTime(g.createdAt)}</td>
                    </tr>
                  ))}
                  {!mine.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No guesses yet. <Link href="/games" className="text-blue-600 underline">Play now</Link></td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          {wins.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg font-bold">🏆 My Wins</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {wins.map((w) => <li key={w.id}>{w.game.address} — {w.prizeAmount ? money(w.prizeAmount) : "Top realtor"} {w.prizeAmount > 0 && (w.paid ? <span className="pill bg-green-100 text-green-700">Paid</span> : <span className="pill bg-amber-100 text-amber-800">Payout pending</span>)}</li>)}
              </ul>
            </section>
          )}
        </div>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg font-bold">Bonus Guesses</h2>
            <p className="mt-1 text-sm text-slate-600">You get <b>{allowedGuesses(settings, u)}</b> guess(es) per home.</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span>MLS comps sister site</span>{u.usedMlsComps ? <span className="pill bg-green-100 text-green-700">+{settings.mlsBonusGuesses} active</span> : <a className="text-blue-600 underline" href={process.env.NEXT_PUBLIC_MLS_SITE_URL} target="_blank" rel="noopener">Unlock</a>}</li>
              <li className="flex justify-between"><span>PriceMortgageRight.com</span>{u.usedMortgageSite ? <span className="pill bg-green-100 text-green-700">+{settings.mortgageBonusGuesses} active</span> : <a className="text-blue-600 underline" href={process.env.NEXT_PUBLIC_MORTGAGE_SITE_URL} target="_blank" rel="noopener">Unlock</a>}</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">Use the same email ({u.email}) on our sister sites and your bonus is applied automatically.</p>
          </section>
          <section className="card p-5"><h2 className="mb-3 text-lg font-bold">Profile</h2><ProfileForm u={{ firstName: u.firstName, lastName: u.lastName, phone: u.phone, city: u.city, marketingOptIn: u.marketingOptIn }} /></section>
          <section className="card p-5"><h2 className="mb-3 text-lg font-bold">Password</h2><PasswordForm /></section>
        </div>
      </div>
    </div>
  );
}
