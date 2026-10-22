import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { updateUserAction } from "@/app/actions/admin";

function Btn({ id, op, value, children, cls = "btn-outline btn-sm" }: { id: string; op: string; value?: string; children: React.ReactNode; cls?: string }) {
  return <form action={updateUserAction} className="inline"><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} />{value && <input type="hidden" name="value" value={value} />}<button className={cls}>{children}</button></form>;
}

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const q = sp.q?.trim();
  const where = sp.filter === "pending" ? eq(schema.users.agentStatus, "PENDING")
    : sp.filter === "agents" ? eq(schema.users.agentStatus, "APPROVED")
    : q ? or(ilike(schema.users.email, `%${q}%`), ilike(schema.users.firstName, `%${q}%`), ilike(schema.users.lastName, `%${q}%`)) : undefined;
  const users = await db.query.users.findMany({ where, with: { agentProfile: true }, orderBy: desc(schema.users.createdAt), limit: 200 });
  const counts = await db.select({ id: schema.guesses.userId, n: sql<number>`count(*)::int` }).from(schema.guesses).groupBy(schema.guesses.userId);
  const c = new Map(counts.map((x) => [x.id, x.n]));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Users & Realtors</h1>
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search name or email" className="input w-64" /><button className="btn-navy btn-sm">Search</button></form>
        <Link href="/admin/users" className="btn-outline btn-sm">All</Link>
        <Link href="/admin/users?filter=pending" className="btn-outline btn-sm">Realtors awaiting approval</Link>
        <Link href="/admin/users?filter=agents" className="btn-outline btn-sm">Approved realtors</Link>
        <a href="/admin/users/export?optin=1" className="btn-green btn-sm">⬇ Download opted-in emails (CSV)</a>
        <a href="/admin/users/export" className="btn-outline btn-sm">⬇ Download all users (CSV)</a>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>User</th><th>Joined</th><th>Guesses</th><th>Realtor</th><th>Promo emails</th><th>MLS bonus</th><th>Mortgage bonus</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.disabled ? "opacity-50" : ""}>
                <td><div className="font-semibold">{u.firstName} {u.lastName} {u.role === "ADMIN" && <span className="pill bg-navy-900 text-white">Admin</span>}</div><div className="text-xs text-slate-500">{u.email} {u.phone && `· ${u.phone}`}</div></td>
                <td className="text-xs">{fmtDate(u.createdAt)}</td>
                <td>{c.get(u.id) ?? 0}</td>
                <td className="text-xs">
                  {u.agentStatus === "NONE" ? "—" : <>
                    <div><b>{u.agentStatus}</b> {u.agentProfile && `· ${u.agentProfile.brokerage}`}</div>
                    {u.agentProfile?.licenseNumber && <div>Lic: {u.agentProfile.licenseNumber} {u.agentProfile.licenseState}</div>}
                    {u.agentStatus !== "APPROVED" && <Btn id={u.id} op="approveAgent" cls="btn-green btn-sm mt-1">Approve</Btn>}
                    {u.agentStatus !== "REJECTED" && <> <Btn id={u.id} op="rejectAgent" cls="btn-outline btn-sm mt-1">{u.agentStatus === "APPROVED" ? "Revoke" : "Reject"}</Btn></>}
                  </>}
                </td>
                <td>{u.marketingOptIn ? <span className="pill bg-green-100 text-green-700">Opted in</span> : <span className="pill bg-slate-100 text-slate-500">No</span>}</td>
                <td><Btn id={u.id} op="toggleMls" value={String(!u.usedMlsComps)} cls={u.usedMlsComps ? "btn-green btn-sm" : "btn-outline btn-sm"}>{u.usedMlsComps ? "On" : "Off"}</Btn></td>
                <td><Btn id={u.id} op="toggleMortgage" value={String(!u.usedMortgageSite)} cls={u.usedMortgageSite ? "btn-green btn-sm" : "btn-outline btn-sm"}>{u.usedMortgageSite ? "On" : "Off"}</Btn></td>
                <td className="whitespace-nowrap">
                  {u.id !== me?.id && (u.disabled ? <Btn id={u.id} op="enable">Enable</Btn> : <Btn id={u.id} op="disable" cls="btn-sm btn text-red-600 hover:bg-red-50">Disable</Btn>)}{" "}
                  {u.id !== me?.id && (u.role === "ADMIN" ? <Btn id={u.id} op="removeAdmin">Remove admin</Btn> : <Btn id={u.id} op="makeAdmin">Make admin</Btn>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
