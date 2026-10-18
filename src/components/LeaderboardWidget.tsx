"use client";
import Link from "next/link";
import { useState } from "react";

type Row = { userId: string; name: string; city: string | null; brokerage?: string | null; points: number; wins: number; streak: number; avgErrorPct: number };

const medal = ["bg-amber-400 text-amber-950", "bg-slate-300 text-slate-800", "bg-orange-300 text-orange-950"];

export function LeaderboardWidget({ pub, agents, annualPrize }: { pub: Row[]; agents: Row[]; annualPrize: number }) {
  const [tab, setTab] = useState<"pub" | "agents">("pub");
  const rows = (tab === "pub" ? pub : agents).slice(0, 10);
  return (
    <aside className="card p-4">
      <h2 className="text-center text-2xl font-extrabold text-navy-900">Who&apos;s Leading?</h2>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
        <button onClick={() => setTab("pub")} className={`rounded-md py-1.5 ${tab === "pub" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Public Ladder</button>
        <button onClick={() => setTab("agents")} className={`rounded-md py-1.5 ${tab === "agents" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Realtor Leaderboard</button>
      </div>
      {tab === "pub" && (
        <div className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-center text-sm font-bold text-amber-900">🏆 ${annualPrize.toLocaleString()} Annual Grand Prize</div>
      )}
      <div className="mt-3 flex justify-between px-1 text-[11px] font-semibold uppercase text-slate-400"><span>Player</span><span>Points · Streak</span></div>
      <ol className="mt-1 divide-y divide-slate-100">
        {rows.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No finished games yet this season — be the first on the board!</li>}
        {rows.map((r, i) => (
          <li key={r.userId} className={`flex items-center gap-3 py-2 ${i === 1 ? "rounded-md bg-green-50" : ""}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${medal[i] ?? "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">{r.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{r.name}</span>
              <span className="block truncate text-xs text-slate-500">{tab === "agents" ? r.brokerage : r.city || `${r.wins} win${r.wins === 1 ? "" : "s"}`}</span>
            </span>
            <span className="text-right text-sm"><b>{r.points}</b> <span className="text-xs text-slate-500">· {r.streak > 0 ? `⭐ ${r.streak}` : "—"}</span></span>
          </li>
        ))}
      </ol>
      <Link href="/leaderboards" className="btn-outline mt-3 w-full">Full leaderboards</Link>
    </aside>
  );
}
