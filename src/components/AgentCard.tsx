import type { AgentProfile } from "@/db/schema";

export function Avatar({ src, name, size = "h-12 w-12" }: { src?: string | null; name: string; size?: string }) {
  return src
    ? <img src={src} alt={name} className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white`}>{name.split(" ").map((s) => s[0]).join("").slice(0, 2)}</span>;
}

export function AgentMini({ agent, stats }: { agent: AgentProfile; stats: { games: number; winRate: number } | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <Avatar src={agent.photoUrl} name={agent.displayName} />
      <div className="min-w-0 flex-1">
        <div className="font-bold">{agent.displayName}</div>
        <div className="text-sm text-slate-500">{agent.brokerage}</div>
      </div>
      {stats && (
        <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs">
          <div className="font-semibold text-slate-600">Quick Stats</div>
          <div><b>{stats.games}</b> games guessed</div>
          <div><b>{stats.winRate}%</b> win rate</div>
        </div>
      )}
    </div>
  );
}

export function AgentInfo({ agent }: { agent: AgentProfile }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-4">
        <Avatar src={agent.photoUrl} name={agent.displayName} size="h-20 w-20" />
        <div>
          <div className="text-lg font-bold">{agent.displayName}</div>
          <div className="text-sm text-slate-600">{agent.brokerage}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {agent.phone && <a href={`tel:${agent.phone}`} className="btn-blue btn-sm">Call Agent</a>}
            {agent.email && <a href={`mailto:${agent.email}`} className="btn-blue btn-sm">Contact Agent</a>}
            {agent.website && <a href={agent.website} target="_blank" rel="noopener" className="btn-outline btn-sm">Website</a>}
          </div>
        </div>
      </div>
      {agent.bio && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{agent.bio}</p>}
    </div>
  );
}
