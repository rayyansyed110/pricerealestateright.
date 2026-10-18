"use client";
import { saveAgentProfileAction, submitVideoAction } from "@/app/actions/agent";
import type { AgentProfile } from "@/db/schema";
import { Msg, Submit, useForm } from "./ui";

export function AgentProfileForm({ p, defaultName }: { p: AgentProfile | null; defaultName: string }) {
  const { state: s, onSubmit: a, pending } = useForm(saveAgentProfileAction);
  return (
    <form onSubmit={a} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label">Display name</label><input name="displayName" defaultValue={p?.displayName ?? defaultName} required className="input" /></div>
      <div><label className="label">Brokerage</label><input name="brokerage" defaultValue={p?.brokerage ?? ""} required className="input" /></div>
      <div><label className="label">License #</label><input name="licenseNumber" defaultValue={p?.licenseNumber ?? ""} className="input" /></div>
      <div><label className="label">License state</label><input name="licenseState" defaultValue={p?.licenseState ?? ""} className="input" /></div>
      <div><label className="label">Phone</label><input name="phone" defaultValue={p?.phone ?? ""} className="input" /></div>
      <div><label className="label">Website</label><input name="website" type="url" defaultValue={p?.website ?? ""} placeholder="https://" className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Short bio (neighborhood expertise, negotiation tips…)</label><textarea name="bio" rows={3} defaultValue={p?.bio ?? ""} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Headshot</label><input name="photo" type="file" accept="image/*" className="text-sm" /></div>
      <div className="space-y-2 sm:col-span-2"><Msg state={s} /><Submit pending={pending}>Save realtor profile</Submit></div>
    </form>
  );
}

export function VideoSubmitForm({ games }: { games: { id: string; label: string }[] }) {
  const { state: s, onSubmit: a, pending } = useForm(submitVideoAction);
  return (
    <form onSubmit={a} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label">Home</label><select name="gameId" required className="input">{games.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
      <div><label className="label">Video type</label>
        <select name="type" className="input">
          <option value="AGENT_PROMO">Meet the Agent & Neighborhood Intro</option>
          <option value="WALKTHROUGH">Property Walkthrough & Features Tour</option>
          <option value="CLOSING">Closing & Negotiation (after sale closes)</option>
        </select>
      </div>
      <div className="sm:col-span-2"><label className="label">Title</label><input name="title" required className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Video link (YouTube, Vimeo or .mp4)</label><input name="url" type="url" required placeholder="https://youtube.com/watch?v=…" className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" rows={2} className="input" /></div>
      <p className="text-xs text-slate-500 sm:col-span-2">⚠️ Videos must <b>not mention the price</b>. Talk about yourself, the neighborhood, the home&apos;s features and negotiation tactics. Videos are reviewed before going live.</p>
      <div className="space-y-2 sm:col-span-2"><Msg state={s} /><Submit pending={pending} pendingText="Submitting…">Submit video</Submit></div>
    </form>
  );
}
