import { and, desc, eq, like, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { smsConfigured } from "@/lib/sms";
import { fmtDateTime } from "@/lib/format";
import { SmsAnnounceForm, SmsTestForm } from "@/components/AdminForms";

export default async function TextPlayers() {
  const [[alerts], [consent], logs] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(and(eq(schema.users.smsConsent, true), eq(schema.users.smsGameAlerts, true), eq(schema.users.disabled, false))),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(and(eq(schema.users.smsConsent, true), eq(schema.users.disabled, false))),
    db.select().from(schema.emailLogs).where(like(schema.emailLogs.type, "SMS_%")).orderBy(desc(schema.emailLogs.createdAt)).limit(200),
  ]);
  const app = (process.env.APP_URL || "https://www.pricerealestateright.com").replace(/\/$/, "");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Text Players</h1>
      {!smsConfigured() && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Twilio isn&apos;t set up yet, so texts are only recorded in the log below, not sent. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID (or TWILIO_FROM_NUMBER) in Vercel.</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-bold">Automatic texts</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li><b>New games:</b> every Saturday morning, players with game alerts ({alerts?.n ?? 0}) get a text when new games open.</li>
            <li><b>Results:</b> when you close a game with &quot;send result emails&quot; on, the winner gets a text, and players with game alerts get their result.</li>
            <li>Only players who agreed to texts ({consent?.n ?? 0}) are ever texted. Replying STOP turns texts off for them.</li>
          </ul>
          <div className="mt-4"><SmsAnnounceForm players={alerts?.n ?? 0} /></div>
        </section>
        <section className="card p-6">
          <h2 className="font-bold">Send a test text</h2>
          <p className="mb-3 mt-1 text-sm text-slate-600">On a Twilio trial account, texts only reach numbers you&apos;ve verified in Twilio.</p>
          <SmsTestForm />
          <p className="mt-4 text-xs text-slate-500">Twilio incoming-message webhook (for STOP replies): <code className="break-all">{app}/api/twilio/inbound</code></p>
        </section>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>When</th><th>To</th><th>Type</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}><td className="text-xs">{fmtDateTime(l.createdAt)}</td><td>{l.to}</td><td>{l.type.replace("SMS_", "")}</td><td className="max-w-md text-xs">{l.subject}</td>
                <td><span className={`pill ${l.status === "sent" ? "bg-green-100 text-green-700" : l.status === "failed" ? "bg-red-100 text-red-700" : "bg-slate-100"}`}>{l.status}</span>{l.error && <div className="text-xs text-red-600">{l.error}</div>}</td></tr>
            ))}
            {!logs.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No texts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
