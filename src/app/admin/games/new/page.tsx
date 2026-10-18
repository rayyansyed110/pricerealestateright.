import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db";
import { weeklyWindow } from "@/lib/game";
import { getSettings } from "@/lib/settings";
import { TZ } from "@/lib/format";
import { GameForm } from "@/components/AdminForms";

export default async function NewGame() {
  const [agents, s] = await Promise.all([db.query.agentProfiles.findMany(), getSettings()]);
  const w = weeklyWindow(new Date(), true);
  const f = (d: Date) => formatInTimeZone(d, TZ, "yyyy-MM-dd'T'HH:mm");
  return (
    <div className="card p-6">
      <h1 className="mb-1 text-2xl font-extrabold">New game</h1>
      <p className="mb-6 text-sm text-slate-500">Defaults to next week&apos;s window (Saturday 3:00 AM → Friday 11:59 PM). You can add photos and videos now or later.</p>
      <GameForm tzLabel={TZ} g={{ opensAt: f(w.opensAt), closesAt: f(w.closesAt), prizeAmount: s.gamePrize, published: true }} agents={agents.map((a) => ({ id: a.id, label: `${a.displayName} — ${a.brokerage}` }))} />
    </div>
  );
}
