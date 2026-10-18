import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { agentQuickStats, gameStatus, getGameBySlug, rankGuesses } from "@/lib/game";
import { allowedGuesses, getSettings } from "@/lib/settings";
import { featureList, fmtDate, fmtDateTime, money, num } from "@/lib/format";
import { VIDEO_LABELS } from "@/lib/video";
import { Gallery } from "@/components/Gallery";
import { GuessForm } from "@/components/GuessForm";
import { Countdown } from "@/components/Countdown";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AgentInfo, AgentMini } from "@/components/AgentCard";
import { GuessDistribution } from "@/components/GuessDistribution";
import { StatusPill } from "@/components/GameCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = await getGameBySlug((await params).slug);
  return g ? { title: `${g.address}, ${g.city} — Guess the price`, openGraph: { images: g.photos[0]?.url ? [g.photos[0].url] : [] } } : {};
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [game, user, settings] = await Promise.all([getGameBySlug(slug), getCurrentUser(), getSettings()]);
  if (!game || (!game.published && user?.role !== "ADMIN")) notFound();
  const status = gameStatus(game);

  const allGuesses = await db.query.guesses.findMany({ where: eq(schema.guesses.gameId, game.id), orderBy: asc(schema.guesses.amount), with: { user: { with: { agentProfile: true } } } });
  const mine = user ? allGuesses.filter((g) => g.userId === user.id) : [];
  const allowed = user ? allowedGuesses(settings, user) : settings.baseGuesses;
  const showOthers = status === "PENDING" || status === "CLOSED";
  const dist = allGuesses.map((g) => ({
    id: g.id, amount: g.amount, userId: g.userId, isAgent: g.isAgent, createdAt: g.createdAt,
    name: g.isAgent && g.user.agentProfile ? g.user.agentProfile.displayName : `${g.user.firstName} ${g.user.lastName.charAt(0)}.`,
  }));

  const v = (t: keyof typeof VIDEO_LABELS) => game.videos.find((x) => x.type === t);
  const closingVideo = status === "CLOSED" ? v("CLOSING") : undefined;
  const promo = v("AGENT_PROMO"), walk = v("WALKTHROUGH");
  const featuredAgent = (closingVideo ?? promo ?? walk)?.agent ?? game.listingAgent;
  const stats = featuredAgent ? await agentQuickStats(featuredAgent.id) : null;
  const cover = game.photos[0]?.url;
  const mls = game.mlsUrl || process.env.NEXT_PUBLIC_MLS_SITE_URL;

  const ranked = status === "CLOSED" ? rankGuesses(dist.filter((d) => !d.isAgent), game.finalSalePrice!) : [];
  const rankedAgents = status === "CLOSED" ? rankGuesses(dist.filter((d) => d.isAgent), game.finalSalePrice!) : [];
  const nameOf = new Map(dist.map((d) => [d.userId, d.name]));

  return (
    <div className="container-x py-8">
      <nav className="mb-4 text-sm text-slate-500"><Link href="/games" className="hover:underline">Games</Link> / {game.address}</nav>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        {/* LEFT top: title + photos */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={status} />
            <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{game.address}, {game.city}, {game.state} {game.zip}</h1>
          </div>
          <Gallery photos={game.photos} alt={game.address} />
        </div>

        {/* RIGHT: game card (layout matches the 4 mockup designs) */}
        <aside className="min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200">
            <div className="relative bg-navy-900 p-4 text-white">
              {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
              <ul className="relative space-y-1.5 text-sm">
                <li>💲 <b>Est. Listing Price:</b> <span className="text-lg font-extrabold text-green-400">{money(game.listPrice)}</span></li>
                <li>📐 <b>Sq Ft:</b> {game.sqft.toLocaleString()}</li>
                <li>🛏 <b>Beds/Baths:</b> {num(game.beds)} Bed, {num(game.baths)} Bath</li>
                <li>🏷 <b>Last Sold:</b> {game.lastSoldPrice ? `${money(game.lastSoldPrice)} (${fmtDate(game.lastSoldDate)})` : "—"}</li>
                {featureList(game.features).length > 0 && <li>📋 <b>Features:</b> {featureList(game.features).slice(0, 5).join(", ")}</li>}
              </ul>
            </div>

            <div className="space-y-4 p-4">
              {closingVideo ? (
                <VideoPlayer url={closingVideo.url} title={closingVideo.title || "Closing & Negotiation"} poster={cover} agentPhoto={closingVideo.agent?.photoUrl} badge="Closed & Sold" />
              ) : promo ? (
                <VideoPlayer url={promo.url} title={promo.title || VIDEO_LABELS.AGENT_PROMO} poster={cover} agentPhoto={promo.agent?.photoUrl} />
              ) : walk ? (
                <VideoPlayer url={walk.url} title={walk.title || VIDEO_LABELS.WALKTHROUGH} poster={game.photos[1]?.url ?? cover} />
              ) : game.listingAgent ? (
                <>
                  <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Agent Info</h3>{status === "OPEN" && <Countdown to={game.closesAt.toISOString()} />}</div>
                  <AgentInfo agent={game.listingAgent} />
                </>
              ) : null}

              {featuredAgent && (closingVideo || promo || walk) && <AgentMini agent={featuredAgent} stats={stats} />}

              {status === "OPEN" && (
                <>
                  {(closingVideo || promo || walk || !game.listingAgent) && <div className="text-center"><Countdown to={game.closesAt.toISOString()} /></div>}
                  <GuessForm gameId={game.id} slug={game.slug} listPrice={game.listPrice} signedIn={!!user} remaining={Math.max(0, allowed - mine.length)} allowed={allowed} />
                  {mine.length > 0 && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm">
                      <div className="font-semibold">Your guesses</div>
                      {mine.map((g) => <div key={g.id} className="flex justify-between"><span>{fmtDateTime(g.createdAt)}</span><b>{money(g.amount)}</b></div>)}
                      <p className="mt-1 text-xs text-slate-500">Other players&apos; guesses are revealed when guessing closes.</p>
                    </div>
                  )}
                  <p className="text-center text-xs text-slate-500">{dist.length} guesses so far · Guessing closes {fmtDateTime(game.closesAt)}</p>
                </>
              )}

              {status === "UPCOMING" && <div className="rounded-lg bg-slate-100 p-4 text-center text-sm">Guessing opens <b>{fmtDateTime(game.opensAt)}</b></div>}

              {status === "PENDING" && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
                  <div className="font-bold text-amber-900">Bidding closed — pending sale</div>
                  <p className="text-amber-900/80">We&apos;ll email every player when the home closes and the winner is picked.</p>
                  {mine.length > 0 && <p className="mt-2">Your guess{mine.length > 1 ? "es" : ""}: <b>{mine.map((m) => money(m.amount)).join(", ")}</b></p>}
                </div>
              )}

              {status === "CLOSED" && (
                <div className="space-y-3 rounded-lg bg-slate-100 p-4">
                  <div className="text-center font-semibold text-slate-700">Bidding Closed — Final Results</div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-300"><div className="h-full w-[92%] rounded-full bg-green-500" /></div>
                  <div className="text-center text-lg">Final Sale Price: <b className="text-2xl text-green-600">{money(game.finalSalePrice)}</b></div>
                  <div className="border-t border-slate-300 pt-2">
                    <div className="text-center font-bold">Winning Guesses</div>
                    <ol className="mt-1 list-decimal pl-6 text-sm">
                      {ranked.slice(0, 5).map((r, i) => (
                        <li key={r.id} className={r.userId === user?.id ? "font-bold text-blue-700" : ""}>
                          {nameOf.get(r.userId)} — {money(r.amount)} <span className="text-slate-500">({r.diff === 0 ? "exact!" : `off ${money(r.diff)}`})</span> {i === 0 && "🏆"}
                        </li>
                      ))}
                    </ol>
                    {ranked.length === 0 && <p className="text-center text-sm text-slate-500">No public guesses.</p>}
                  </div>
                  {rankedAgents[0] && <div className="rounded-md bg-white p-2 text-sm">🏅 Top Realtor: <b>{nameOf.get(rankedAgents[0].userId)}</b> — {money(rankedAgents[0].amount)}</div>}
                  {user && mine.length > 0 && (() => {
                    const list = mine[0].isAgent ? rankedAgents : ranked;
                    const pos = list.findIndex((r) => r.userId === user.id);
                    return pos >= 0 ? <div className="rounded-md bg-blue-50 p-2 text-sm text-blue-900">You finished <b>#{pos + 1}</b> of {list.length}, off by {money(list[pos].diff)}.</div> : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* LEFT bottom: details (on phones this comes after the guess card) */}
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">

          <div className="card p-5">
            <h2 className="text-lg font-bold">Property Details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <D k="Est. Listing Price" v={money(game.listPrice)} strong />
              <D k="Beds / Baths" v={`${num(game.beds)} Bed, ${num(game.baths)} Bath`} />
              <D k="Square Feet" v={game.sqft.toLocaleString()} />
              <D k="Price / Sq Ft (list)" v={money(game.listPrice / game.sqft)} />
              <D k="Last Sold" v={game.lastSoldPrice ? `${money(game.lastSoldPrice)} (${fmtDate(game.lastSoldDate)})` : "—"} />
              {game.yearBuilt && <D k="Year Built" v={String(game.yearBuilt)} />}
              {game.lotSize && <D k="Lot Size" v={game.lotSize} />}
              {game.propertyType && <D k="Property Type" v={game.propertyType} />}
              {game.mlsNumber && <D k="MLS #" v={game.mlsNumber} />}
            </dl>
            {featureList(game.features).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">{featureList(game.features).map((f) => <span key={f} className="pill bg-slate-100 text-slate-700">{f}</span>)}</div>
            )}
            {game.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{game.description}</p>}
          </div>

          {(status === "OPEN" || status === "UPCOMING") && <div className="card flex flex-col gap-4 bg-gradient-to-r from-navy-900 to-navy-700 p-5 text-white sm:flex-row sm:items-center">
            <div className="flex-1">
              <h3 className="text-lg font-bold">Research the comps before you guess</h3>
              <p className="text-sm text-slate-300">Look up recently sold homes nearby on our MLS sister site. Users of the site get <b className="text-amber-300">+{settings.mlsBonusGuesses} extra guess</b> per game, and PriceMortgageRight.com users get a <b className="text-amber-300">bonus chance</b>.</p>
            </div>
            <a href={mls} target="_blank" rel="noopener" className="btn-green shrink-0">Research comps ↗</a>
          </div>}

          {(promo || walk) && (
            <div id="videos" className="card space-y-4 p-5">
              <h2 className="text-lg font-bold">Agent Videos</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[promo, walk].filter(Boolean).map((vid) => (
                  <div key={vid!.id}>
                    <VideoPlayer url={vid!.url} title={vid!.title} poster={vid!.type === "WALKTHROUGH" ? game.photos[1]?.url ?? cover : cover} agentPhoto={vid!.type === "AGENT_PROMO" ? vid!.agent?.photoUrl : null} />
                    {vid!.description && <p className="mt-2 text-sm text-slate-600">{vid!.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showOthers && (
            <div className="card p-5">
              <h2 className="text-lg font-bold">{status === "PENDING" ? "How everyone guessed" : "Final guess distribution"}</h2>
              {status === "PENDING" && <p className="mb-2 text-sm text-slate-500">Guessing is closed. The winner is picked when the sale closes and the price is public record.</p>}
              <GuessDistribution guesses={dist} meId={user?.id} listPrice={game.listPrice} finalPrice={game.finalSalePrice} />
              {status === "PENDING" && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-blue-600">See every guess ({dist.length})</summary>
                  <ul className="mt-2 max-h-80 divide-y divide-slate-100 overflow-auto text-sm">
                    {[...dist].reverse().map((d) => (
                      <li key={d.id} className={`flex justify-between px-2 py-1.5 ${d.userId === user?.id ? "bg-red-50 font-semibold" : ""}`}>
                        <span>{d.name} {d.isAgent && <span className="pill ml-1 bg-blue-100 text-blue-700">Realtor</span>} {d.userId === user?.id && "(you)"}</span>
                        <span>{money(d.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function D({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div><dt className="text-xs uppercase text-slate-500">{k}</dt><dd className={strong ? "text-lg font-bold text-green-600" : "font-medium"}>{v}</dd></div>;
}
