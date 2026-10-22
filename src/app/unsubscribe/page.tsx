import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyUnsubToken } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u, t } = await searchParams;
  const ok = !!u && !!t && verifyUnsubToken(u, t);
  if (ok) await db.update(schema.users).set({ marketingOptIn: false }).where(eq(schema.users.id, u!));
  return (
    <div className="container-x flex justify-center py-16">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl font-extrabold text-navy-900">{ok ? "You're unsubscribed" : "Link not valid"}</h1>
        <p className="mt-2 text-slate-600">
          {ok ? "You won't receive promotional emails from us anymore. You'll still get emails about games you play, like your results."
              : "This unsubscribe link is invalid or incomplete. You can turn off promotional emails on your My Account page."}
        </p>
        <Link href="/account" className="btn-outline mt-6">My Account</Link>
      </div>
    </div>
  );
}
