import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isApprovedAgent } from "@/lib/auth";
import { ladder, listGames } from "@/lib/game";
import { VIDEO_LABELS } from "@/lib/video";
import { AgentProfileForm, VideoSubmitForm } from "@/components/AgentForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Realtor Hub" };

export default async function RealtorHub() {
  const u = await getCurrentUser();
  const top = (await ladder(true)).slice(0, 5);
  const intro = (
    <section className="rounded-2xl bg-gradient-to-r from-navy-900 to-navy-700 p-8 text-white">
      <h1 className="text-3xl font-black">Realtor Hub</h1>
      <p className="mt-2 max-w-2xl text-slate-200">Prove you know your market. Compete on the Realtor Leaderboard, and promote yourself with videos about your listings, your neighborhood and your negotiation tactics — seen by every player in the game.</p>
    </section>
  );
  if (!u) {
    return (
      <div className="container-x space-y-6 py-10">
        {intro}
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-lg font-semibold">Join as a licensed agent</p>
          <div className="flex gap-3"><Link href="/register?agent=1&next=/realtor-hub" className="btn-green">Register as an Agent</Link><Link href="/login?next=/realtor-hub" className="btn-outline">Sign in</Link></div>
        </div>
      </div>
    );
  }
  const approved = isApprovedAgent(u);
  const [games, myVideos] = await Promise.all([
    approved ? listGames("all") : Promise.resolve([]),
    u.agentProfile ? db.query.videos.findMany({ where: eq(schema.videos.agentId, u.agentProfile.id), with: { game: true }, orderBy: desc(schema.videos.createdAt) }) : Promise.resolve([]),
  ]);
  return (
    <div className="container-x space-y-6 py-10">
      {intro}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Realtor Profile</h2>
              <span className={`pill ${approved ? "bg-green-100 text-green-700" : u.agentStatus === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                {approved ? "Approved" : u.agentStatus === "PENDING" ? "Pending review" : u.agentStatus === "REJECTED" ? "Not approved" : "Not an agent yet"}
              </span>
            </div>
            <AgentProfileForm p={u.agentProfile} defaultName={`${u.firstName} ${u.lastName}`} />
          </section>
          {approved && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-bold">Post a Video</h2>
              <VideoSubmitForm games={games.map((g) => ({ id: g.id, label: `${g.address}, ${g.city}` }))} />
            </section>
          )}
          {myVideos.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-bold">My Videos</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {myVideos.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2">
                    <span><b>{v.title}</b> · {VIDEO_LABELS[v.type]} · <Link className="text-blue-600 underline" href={`/games/${v.game.slug}`}>{v.game.address}</Link></span>
                    <span className={`pill ${v.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{v.approved ? "Live" : "In review"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="card h-fit p-5">
          <h2 className="text-lg font-bold">Top Realtors</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {top.map((r, i) => <li key={r.userId} className="flex justify-between"><span>{i + 1}. {r.name}</span><b>{r.points} pts</b></li>)}
            {!top.length && <li className="text-slate-500">No finished games yet.</li>}
          </ol>
          <Link href="/leaderboards" className="btn-outline mt-4 w-full">Full leaderboard</Link>
        </aside>
      </div>
    </div>
  );
}
