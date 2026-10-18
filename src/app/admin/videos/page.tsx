import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { VIDEO_LABELS } from "@/lib/video";
import { setVideoApprovalAction } from "@/app/actions/admin";
import { VideoPlayer } from "@/components/VideoPlayer";

export default async function Videos() {
  const vids = await db.query.videos.findMany({ where: eq(schema.videos.approved, false), with: { game: true, agent: true }, orderBy: desc(schema.videos.createdAt) });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Video Approvals</h1>
      <p className="text-sm text-slate-500">Watch each video and make sure it does not mention the price before approving.</p>
      {!vids.length && <div className="card p-8 text-center text-slate-500">Nothing to review 🎉</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {vids.map((v) => (
          <div key={v.id} className="card space-y-2 p-4">
            <VideoPlayer url={v.url} title={v.title} />
            <div className="text-sm"><b>{v.title}</b> · {VIDEO_LABELS[v.type]}<br />By {v.agent?.displayName ?? "—"} for <Link href={`/admin/games/${v.gameId}`} className="text-blue-600 underline">{v.game.address}</Link></div>
            {v.description && <p className="text-sm text-slate-600">{v.description}</p>}
            <div className="flex gap-2">
              <form action={setVideoApprovalAction}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="op" value="approve" /><button className="btn-green btn-sm">Approve</button></form>
              <form action={setVideoApprovalAction}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="op" value="delete" /><button className="btn-red btn-sm">Reject & delete</button></form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
