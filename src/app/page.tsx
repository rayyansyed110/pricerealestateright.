import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ladder, listGames, weeklyWindow } from "@/lib/game";
import { getSettings } from "@/lib/settings";
import { guessInfo } from "@/lib/player";
import { money } from "@/lib/format";
import { GameCard } from "@/components/GameCard";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";
import { Countdown } from "@/components/Countdown";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, settings, active, pending, closed, pub, agents] = await Promise.all([
    getCurrentUser(), getSettings(), listGames("active"), listGames("pending"), listGames("closed"), ladder(false), ladder(true),
  ]);
  const info = await guessInfo([...active, ...pending].map((g) => g.id), user, settings);
  const closesAt = active[0]?.closesAt ?? weeklyWindow().closesAt;
  const mls = process.env.NEXT_PUBLIC_MLS_SITE_URL!, mort = process.env.NEXT_PUBLIC_MORTGAGE_SITE_URL!;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-800 to-navy-950 text-white">
        <HeroArt />
        <div className="container-x relative py-12 text-center sm:py-16">
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl">Guess the Sale Price, <span className="text-amber-400">Win Cash!</span></h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-200">Players &amp; Agents compete weekly to predict final sale prices of homes on contract.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={user ? "#games" : "/register"} className="btn-green px-6 py-3 text-base">Start Guessing Now</Link>
            <Link href="/realtor-hub" className="btn-ghost-light px-6 py-3 text-base">Are You an Agent? Play Here</Link>
            <a href={mls} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-left text-sm ring-1 ring-white/20 hover:bg-white/15">
              <span className="text-2xl">🏅</span><span>Get <b className="text-amber-300">{settings.mlsBonusGuesses} extra guess</b> by using our<br />sister MLS comps site</span>
            </a>
            <a href={mort} target="_blank" rel="noopener" className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-left text-sm ring-1 ring-white/20 hover:bg-white/15">
              <span className="text-2xl">🏠</span><span>Bonus chance with<br /><b className="text-amber-300 underline">PriceMortgageRight.com!</b></span>
            </a>
          </div>
        </div>
      </section>

      <section id="games" className="container-x mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="h-section">This Week&apos;s Active Games</h2>
              {active.length > 0 && <Countdown to={closesAt.toISOString()} />}
            </div>
            <div className="text-right text-sm"><div className="font-semibold">Weekly Game</div><div className="text-slate-500">Saturday 3 AM – Friday 11:59 PM</div></div>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {active.map((g) => <GameCard key={g.id} game={g} signedIn={!!user} remaining={info.remaining(g.id)} allowed={info.allowed} guessCount={info.total(g.id)} />)}
            {active.length === 0 && <div className="card col-span-full p-10 text-center text-slate-500">New homes go live every Saturday at 3 AM. Check back soon!</div>}
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><span className="text-green-600">✔</span> Listing data comes from the MLS. Research comps on <a href={mls} className="font-semibold text-blue-600 hover:underline" target="_blank" rel="noopener">our MLS sister site</a> before you guess.</p>

          {pending.length > 0 && (
            <div className="mt-12">
              <h2 className="h-section">Pending Sale — See How Everyone Guessed</h2>
              <p className="text-sm text-slate-500">Guessing is closed. Winners are picked when the sale closes and the price is public record.</p>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {pending.map((g) => <GameCard key={g.id} game={g} signedIn={!!user} remaining={0} allowed={info.allowed} guessCount={info.total(g.id)} />)}
              </div>
            </div>
          )}

          {closed.length > 0 && (
            <div className="mt-12">
              <h2 className="h-section">Recent Results</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {closed.slice(0, 6).map((g) => (
                  <Link key={g.id} href={`/games/${g.slug}`} className="card flex gap-3 overflow-hidden p-2 hover:ring-blue-300">
                    {g.photos[0] && <img src={g.photos[0].url} alt="" className="h-20 w-24 rounded-lg object-cover" />}
                    <div className="text-sm"><div className="font-semibold">{g.address}</div><div className="text-slate-500">{g.city}, {g.state}</div><div>Sold <b className="text-green-600">{money(g.finalSalePrice)}</b></div></div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <LeaderboardWidget pub={pub} agents={agents} annualPrize={settings.annualPrize} />
        </div>
      </section>
    </>
  );
}

function HeroArt() {
  const coin = (x: string, y: string, s = 1) => (
    <div className="absolute flex items-center justify-center rounded-full bg-amber-400 font-black text-amber-800 shadow-lg ring-2 ring-amber-200" style={{ left: x, top: y, width: 34 * s, height: 34 * s, fontSize: 16 * s }}>$</div>
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
      {coin("6%", "18%")}{coin("12%", "62%", 0.8)}{coin("88%", "20%", 1.1)}{coin("80%", "60%", 0.8)}{coin("93%", "70%", 0.7)}
      <svg className="absolute bottom-0 left-2 hidden h-28 sm:block" viewBox="0 0 120 90"><path d="M10 45 60 10l50 35v45H10Z" fill="#fde68a" /><path d="M2 48 60 6l58 42" stroke="#ef4444" strokeWidth="8" fill="none" /><rect x="48" y="58" width="24" height="32" fill="#2563eb" /><rect x="20" y="52" width="18" height="16" fill="#93c5fd" /><rect x="82" y="52" width="18" height="16" fill="#93c5fd" /></svg>
      <svg className="absolute bottom-0 right-2 hidden h-28 sm:block" viewBox="0 0 120 90"><path d="M10 45 60 10l50 35v45H10Z" fill="#fed7aa" /><path d="M2 48 60 6l58 42" stroke="#c2410c" strokeWidth="8" fill="none" /><rect x="48" y="58" width="24" height="32" fill="#065f46" /><rect x="20" y="52" width="18" height="16" fill="#bfdbfe" /><rect x="82" y="52" width="18" height="16" fill="#bfdbfe" /></svg>
    </div>
  );
}
