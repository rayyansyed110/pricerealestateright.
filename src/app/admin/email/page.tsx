import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getTextSetting } from "@/lib/settings";
import { MarketingForm } from "@/components/AdminForms";

export default async function EmailPlayers() {
  const [[row], address] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(and(eq(schema.users.marketingOptIn, true), eq(schema.users.disabled, false))),
    getTextSetting("mailingAddress"),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Email Players</h1>
        <a href="/admin/users/export?optin=1" className="btn-outline btn-sm">⬇ Download opted-in list (CSV)</a>
      </div>
      {!process.env.RESEND_API_KEY && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The email service (Resend) isn&apos;t set up yet, so emails will only be recorded in the <Link href="/admin/emails" className="underline">Email Log</Link>, not delivered.</p>}
      <section className="card p-6">
        <p className="mb-4 text-sm text-slate-600">Goes only to players who ticked <b>&quot;Send me news… and promotions&quot;</b> ({row?.n ?? 0} right now). Every email includes an unsubscribe link and your mailing address, as US law (CAN-SPAM) requires. Always send yourself a test first.</p>
        <MarketingForm address={address} optedIn={row?.n ?? 0} />
      </section>
    </div>
  );
}
