import { announceOpenGames } from "@/lib/game";

export const dynamic = "force-dynamic";

// Vercel Cron calls this every Saturday morning (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const r = await announceOpenGames();
  return Response.json(r);
}
