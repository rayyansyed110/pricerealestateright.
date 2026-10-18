import Link from "next/link";
import type { AgentProfile, Game, Photo, Video } from "@/db/schema";
import { gameStatus, STATUS_LABEL } from "@/lib/game";
import { money, num } from "@/lib/format";
import { GuessForm } from "./GuessForm";

type G = Game & { photos: Photo[]; videos: Video[]; listingAgent: AgentProfile | null };

export function StatusPill({ status }: { status: ReturnType<typeof gameStatus> }) {
  const c = { UPCOMING: "bg-slate-200 text-slate-700", OPEN: "bg-green-500 text-white", PENDING: "bg-amber-400 text-amber-950", CLOSED: "bg-navy-900 text-white" }[status];
  return <span className={`pill ${c}`}>{STATUS_LABEL[status]}</span>;
}

export function GameCard({ game, signedIn, remaining, allowed, guessCount }: { game: G; signedIn: boolean; remaining: number; allowed: number; guessCount?: number }) {
  const status = gameStatus(game);
  const cover = game.photos[0]?.url;
  const promo = game.videos.find((v) => v.type === "AGENT_PROMO" || v.type === "WALKTHROUGH");
  return (
    <article className="card overflow-hidden">
      <Link href={`/games/${game.slug}`} className="group relative block aspect-[16/10] overflow-hidden bg-slate-300">
        {cover && <img src={cover} alt={game.address} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3"><StatusPill status={status} /></div>
        {status === "OPEN" && (
          <div className="absolute right-3 top-3 flex h-14 w-14 rotate-12 flex-col items-center justify-center rounded-full bg-amber-400 text-center text-[10px] font-extrabold leading-tight text-amber-950 shadow-lg ring-2 ring-amber-200">
            {money(game.prizeAmount)}<span className="font-semibold">Prize</span>
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 text-white">
          <h3 className="text-lg font-bold drop-shadow">{game.address}, {game.city}, {game.state}</h3>
          <p className="text-sm text-slate-200">{num(game.beds)} Bed · {num(game.baths)} Bath · {game.sqft.toLocaleString()} sq ft · <span className="font-semibold text-amber-300">Listed {money(game.listPrice)}</span></p>
        </div>
      </Link>
      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
        {status === "OPEN" ? (
          <GuessForm compact gameId={game.id} slug={game.slug} listPrice={game.listPrice} signedIn={signedIn} remaining={remaining} allowed={allowed} />
        ) : (
          <div className="flex flex-col justify-center rounded-xl bg-slate-50 p-4 text-sm">
            {status === "CLOSED" ? <>Sold for <b className="text-2xl text-green-600">{money(game.finalSalePrice)}</b></> :
             status === "PENDING" ? <>Guessing closed — waiting for the sale to close. <b>See how everyone guessed →</b></> : <>Opens soon. Check back Saturday!</>}
          </div>
        )}
        {promo && (
          <Link href={`/games/${game.slug}#videos`} className="relative hidden w-40 overflow-hidden rounded-xl bg-navy-900 text-white sm:block">
            {(game.listingAgent?.photoUrl || game.photos[1]?.url) && <img src={game.listingAgent?.photoUrl || game.photos[1]?.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <span className="absolute left-1/2 top-[38%] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/40">▶</span>
            <span className="absolute inset-x-2 bottom-2 text-xs font-semibold leading-tight">Agent Video Walkthrough<br /><span className="font-normal text-slate-300">Watch & learn comps</span></span>
          </Link>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        <span>{guessCount != null ? `${guessCount} guesses so far` : ""}</span>
        <Link href={`/games/${game.slug}`} className="font-semibold text-blue-600 hover:underline">View details & comps →</Link>
      </div>
    </article>
  );
}
