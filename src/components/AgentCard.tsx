import type { AgentProfile } from "@/db/schema";
import { normalizeUrl, proCategoryLabel } from "@/lib/pro";

export function Avatar({ src, name, size = "h-12 w-12" }: { src?: string | null; name: string; size?: string }) {
  return src
    ? <img src={src} alt={name} className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white`}>{name.split(" ").map((s) => s[0]).join("").slice(0, 2)}</span>;
}

const subtitle = (a: AgentProfile) =>
  [a.brokerage, [a.companyCity, a.licenseState].filter(Boolean).join(", ")].filter(Boolean).join(" · ");

/** Name links to the agent's own page (website / Linktree) when they have one. */
function AgentName({ agent, className }: { agent: AgentProfile; className: string }) {
  const href = normalizeUrl(agent.website);
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={`${className} text-blue-700 hover:underline`}>{agent.displayName} ↗</a>
    : <span className={className}>{agent.displayName}</span>;
}

export function AgentMini({ agent, stats, role }: { agent: AgentProfile; stats: { games: number; winRate: number } | null; role?: string }) {
  const href = normalizeUrl(agent.website);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <Avatar src={agent.photoUrl} name={agent.displayName} />
      <div className="min-w-0 flex-1">
        {role && <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{role}</div>}
        <AgentName agent={agent} className="block truncate font-bold" />
        <div className="truncate text-sm text-slate-500">{subtitle(agent)}</div>
        {href && <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">View their page</a>}
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

export function AgentInfo({ agent, role }: { agent: AgentProfile; role?: string }) {
  const href = normalizeUrl(agent.website);
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      {role && <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-800">{role}</div>}
      <div className="flex items-start gap-4">
        <Avatar src={agent.photoUrl} name={agent.displayName} size="h-20 w-20" />
        <div className="min-w-0">
          <AgentName agent={agent} className="text-lg font-bold" />
          <div className="text-sm text-slate-600">{subtitle(agent)}</div>
          {agent.category !== "AGENT" && <div className="text-xs text-slate-500">{proCategoryLabel(agent.category)}</div>}
          <div className="mt-2 flex flex-wrap gap-2">
            {agent.phone && <a href={`tel:${agent.phone}`} className="btn-blue btn-sm">Call</a>}
            {agent.email && <a href={`mailto:${agent.email}`} className="btn-blue btn-sm">Email</a>}
            {href && <a href={href} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">Their page ↗</a>}
          </div>
        </div>
      </div>
      {agent.bio && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{agent.bio}</p>}
    </div>
  );
}
