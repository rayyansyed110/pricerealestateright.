import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { fmtDateTime } from "@/lib/format";

export default async function Emails() {
  const logs = await db.select().from(schema.emailLogs).orderBy(desc(schema.emailLogs.createdAt)).limit(300);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Email Log</h1>
      {!process.env.RESEND_API_KEY && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">RESEND_API_KEY is not set, so emails are only logged (status &quot;logged&quot;), not delivered.</p>}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>When</th><th>To</th><th>Type</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}><td className="text-xs">{fmtDateTime(l.createdAt)}</td><td>{l.to}</td><td>{l.type}</td><td>{l.subject}</td>
                <td><span className={`pill ${l.status === "sent" ? "bg-green-100 text-green-700" : l.status === "failed" ? "bg-red-100 text-red-700" : "bg-slate-100"}`}>{l.status}</span>{l.error && <div className="text-xs text-red-600">{l.error}</div>}</td></tr>
            ))}
            {!logs.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No emails yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
