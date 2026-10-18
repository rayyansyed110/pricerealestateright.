import { money } from "@/lib/format";

type G = { id: string; amount: number; userId: string; name: string; isAgent: boolean };

/** Histogram of all guesses with the player's own guess(es), the list price and (if known) the final price marked. */
export function GuessDistribution({ guesses, meId, listPrice, finalPrice }: { guesses: G[]; meId?: string; listPrice: number; finalPrice?: number | null }) {
  if (!guesses.length) return <p className="text-sm text-slate-500">No guesses were placed on this home.</p>;
  const amounts = guesses.map((g) => g.amount).sort((a, b) => a - b);
  const lo = Math.min(amounts[0], listPrice, finalPrice ?? Infinity);
  const hi = Math.max(amounts[amounts.length - 1], listPrice, finalPrice ?? 0);
  const pad = Math.max((hi - lo) * 0.08, listPrice * 0.02);
  const min = lo - pad, max = hi + pad;
  const BINS = 16;
  const bins = Array.from({ length: BINS }, () => 0);
  amounts.forEach((a) => bins[Math.min(BINS - 1, Math.floor(((a - min) / (max - min)) * BINS))]++);
  const peak = Math.max(...bins);
  const x = (v: number) => ((v - min) / (max - min)) * 100;
  const median = amounts.length % 2 ? amounts[(amounts.length - 1) / 2] : (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2;
  const mine = meId ? guesses.filter((g) => g.userId === meId) : [];

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Guesses" value={String(guesses.length)} />
        <Stat label="Median guess" value={money(median)} />
        <Stat label="Range" value={`${money(amounts[0] / 1000)}k–${money(amounts[amounts.length - 1] / 1000)}k`} />
      </div>
      <div className="relative mt-6 h-36">
        <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]">
          {bins.map((n, i) => <div key={i} className="flex-1 rounded-t bg-blue-200" style={{ height: `${peak ? (n / peak) * 100 : 0}%` }} title={`${n} guesses`} />)}
        </div>
        <Marker left={x(listPrice)} color="bg-slate-500" label={`List ${money(listPrice)}`} />
        {finalPrice != null && <Marker left={x(finalPrice)} color="bg-green-600" label={`Sold ${money(finalPrice)}`} top />}
        {mine.map((g) => <Marker key={g.id} left={x(g.amount)} color="bg-red-500" label={`You ${money(g.amount)}`} top={finalPrice == null} />)}
        <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-slate-400"><span>{money(min)}</span><span>{money(max)}</span></div>
      </div>
      {mine.length > 0 && finalPrice == null && (
        <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          {mine.map((g) => {
            const below = amounts.filter((a) => a < g.amount).length;
            const pct = Math.round((below / amounts.length) * 100);
            return <span key={g.id} className="block">Your guess of <b>{money(g.amount)}</b> is higher than <b>{pct}%</b> of players and {g.amount >= median ? "above" : "below"} the median by {money(Math.abs(g.amount - median))}.</span>;
          })}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-2"><div className="text-[11px] uppercase text-slate-500">{label}</div><div className="font-bold">{value}</div></div>;
}
function Marker({ left, color, label, top }: { left: number; color: string; label: string; top?: boolean }) {
  return (
    <div className="absolute bottom-6 top-0" style={{ left: `${left}%` }}>
      <div className={`h-full w-0.5 ${color}`} />
      <span className={`absolute ${top ? "-top-5" : "top-1"} -translate-x-1/2 whitespace-nowrap rounded px-1.5 text-[10px] font-semibold text-white ${color}`}>{label}</span>
    </div>
  );
}
