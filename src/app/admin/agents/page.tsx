import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ListingAgentForm } from "@/components/AdminForms";
import { Avatar } from "@/components/AgentCard";

export default async function Agents({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  const agents = await db.query.agentProfiles.findMany({ orderBy: asc(schema.agentProfiles.displayName) });
  const editing = agents.find((a) => a.id === sp.edit);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Listing Agents</h1>
      <p className="text-sm text-slate-500">Agents shown on game pages (the &quot;Agent Info&quot; card). Realtors who register get a profile automatically; you can also add agents who don&apos;t have an account.</p>
      <section className="card p-6">
        <h2 className="mb-3 font-bold">{editing ? `Edit ${editing.displayName}` : "Add listing agent"}</h2>
        <ListingAgentForm key={editing?.id ?? "new"} p={editing ? { id: editing.id, displayName: editing.displayName, brokerage: editing.brokerage, phone: editing.phone, email: editing.email, website: editing.website, bio: editing.bio, photoUrl: editing.photoUrl?.startsWith("http") ? editing.photoUrl : "" } : undefined} />
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {agents.map((a) => (
          <a key={a.id} href={`/admin/agents?edit=${a.id}`} className="card flex items-center gap-3 p-3 hover:ring-blue-300">
            <Avatar src={a.photoUrl} name={a.displayName} />
            <div><div className="font-semibold">{a.displayName}</div><div className="text-xs text-slate-500">{a.brokerage} {a.userId ? "· has account" : ""}</div></div>
          </a>
        ))}
      </div>
    </div>
  );
}
