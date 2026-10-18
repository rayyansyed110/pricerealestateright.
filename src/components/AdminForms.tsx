"use client";
import {
  addVideoAction, closeGameAction, saveGameAction, saveListingAgentAction, saveSettingsAction,
} from "@/app/actions/admin";
import { Msg, Submit, useForm } from "./ui";

type GameDefaults = Record<string, string | number | boolean | null | undefined>;

export function GameForm({ g, agents, tzLabel }: { g: GameDefaults; agents: { id: string; label: string }[]; tzLabel: string }) {
  const { state: s, onSubmit: a, pending } = useForm(saveGameAction);
  const v = (k: string) => (g[k] == null ? "" : String(g[k]));
  const F = ({ name, label, type = "text", req, ph, span }: { name: string; label: string; type?: string; req?: boolean; ph?: string; span?: string }) => (
    <div className={span}><label className="label">{label}{req && <span className="text-red-500"> *</span>}</label><input name={name} type={type} defaultValue={v(name)} required={req} placeholder={ph} className="input" step={type === "number" ? "any" : undefined} /></div>
  );
  return (
    <form onSubmit={a} className="space-y-6">
      {g.id && <input type="hidden" name="id" value={String(g.id)} />}
      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-2 text-sm font-bold uppercase text-slate-500">Listing</legend>
        {F({ name: "address", label: "Street address", req: true, span: "sm:col-span-3", })}
        {F({ name: "city", label: "City", req: true, span: "sm:col-span-1", })}
        {F({ name: "state", label: "State", req: true, span: "sm:col-span-1", })}
        {F({ name: "zip", label: "ZIP", span: "sm:col-span-1", })}
        {F({ name: "listPrice", label: "Est. listing price ($)", req: true, ph: "465000", span: "sm:col-span-2", })}
        {F({ name: "beds", label: "Beds", type: "number", req: true, })}
        {F({ name: "baths", label: "Baths", type: "number", req: true, })}
        {F({ name: "sqft", label: "Sq ft", type: "number", req: true, span: "sm:col-span-2", })}
        {F({ name: "lastSoldPrice", label: "Last sold price ($)", span: "sm:col-span-2", })}
        {F({ name: "lastSoldDate", label: "Last sold date", type: "date", span: "sm:col-span-2", })}
        {F({ name: "yearBuilt", label: "Year built", type: "number", span: "sm:col-span-2", })}
        {F({ name: "lotSize", label: "Lot size", ph: "0.25 acres", span: "sm:col-span-2", })}
        {F({ name: "propertyType", label: "Property type", ph: "Single Family", span: "sm:col-span-2", })}
        {F({ name: "mlsNumber", label: "MLS #", span: "sm:col-span-2", })}
        {F({ name: "mlsUrl", label: "Link to listing / comps on MLS sister site", type: "url", ph: "https://", span: "sm:col-span-6" })}
        <div className="sm:col-span-6"><label className="label">Features (comma or one per line)</label><textarea name="features" rows={2} defaultValue={v("features")} placeholder="Hardwood floors, updated kitchen, large backyard" className="input" /></div>
        <div className="sm:col-span-6"><label className="label">Description</label><textarea name="description" rows={4} defaultValue={v("description")} className="input" /></div>
        <div className="sm:col-span-3"><label className="label">Listing agent (shown on Agent Info card)</label>
          <select name="listingAgentId" defaultValue={v("listingAgentId")} className="input"><option value="">— None —</option>{agents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-6">
        <legend className="mb-2 text-sm font-bold uppercase text-slate-500">Game timeline ({tzLabel})</legend>
        {F({ name: "opensAt", label: "Guessing opens", type: "datetime-local", req: true, span: "sm:col-span-2", })}
        {F({ name: "closesAt", label: "Guessing closes", type: "datetime-local", req: true, span: "sm:col-span-2", })}
        {F({ name: "prizeAmount", label: "Prize ($)", type: "number", span: "sm:col-span-1", })}
        <label className="flex items-end gap-2 pb-2 text-sm sm:col-span-1"><input type="checkbox" name="published" defaultChecked={g.published !== false} /> Published</label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold uppercase text-slate-500">Add photos</legend>
        <div><label className="label">Upload images (JPG/PNG/WEBP, up to 4 MB each — add a few at a time)</label><input type="file" name="photos" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" /></div>
        <div><label className="label">…or paste image URLs (one per line)</label><textarea name="photoUrls" rows={2} placeholder="https://…" className="input" /></div>
      </fieldset>
      <Msg state={s} />
      <Submit pending={pending} pendingText="Saving…">{g.id ? "Save changes" : "Create game"}</Submit>
    </form>
  );
}

export function CloseGameForm({ id, current, emailed }: { id: string; current?: number | null; emailed: boolean }) {
  const { state: s, onSubmit: a, pending } = useForm(closeGameAction, "Pick winners using this final sale price? If checked, result emails go out to every player.");
  return (
    <form onSubmit={a} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div><label className="label">Final sale price (public record)</label><input name="finalSalePrice" defaultValue={current ?? ""} required placeholder="485000" className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sendEmails" defaultChecked={!emailed} /> {emailed ? "Re-send result emails to all players" : "Send result emails to all players (won / overbid / underbid)"}</label>
      <Msg state={s} />
      <Submit pending={pending} className="btn-green" pendingText="Closing…">{current ? "Update result" : "Close game & pick winner"}</Submit>
    </form>
  );
}

export function AddVideoForm({ gameId, agents }: { gameId: string; agents: { id: string; label: string }[] }) {
  const { state: s, onSubmit: a, pending } = useForm(addVideoAction);
  return (
    <form onSubmit={a} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="gameId" value={gameId} />
      <div><label className="label">Type</label>
        <select name="type" className="input">
          <option value="AGENT_PROMO">Agent promo / neighborhood intro</option>
          <option value="WALKTHROUGH">Property walkthrough & features</option>
          <option value="CLOSING">Closing & negotiation (shown after close)</option>
        </select>
      </div>
      <div><label className="label">Agent</label><select name="agentId" className="input"><option value="">— None —</option>{agents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label">Title</label><input name="title" required className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Video URL (YouTube, Vimeo or .mp4)</label><input name="url" type="url" required className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><input name="description" className="input" /></div>
      <div className="space-y-2 sm:col-span-2"><Msg state={s} /><Submit pending={pending} className="btn-blue">Add video</Submit></div>
    </form>
  );
}

export function SettingsForm({ s: values }: { s: Record<string, number> }) {
  const { state: s, onSubmit: a, pending } = useForm(saveSettingsAction);
  const fields: [string, string][] = [
    ["baseGuesses", "Guesses per player per game"],
    ["mlsBonusGuesses", "Extra guesses for MLS comps site users"],
    ["mortgageBonusGuesses", "Extra guesses for PriceMortgageRight.com users"],
    ["gamePrize", "Default prize per game ($)"],
    ["annualPrize", "Annual grand prize ($)"],
    ["agentGamePrize", "Realtor prize per game ($, 0 = none)"],
    ["agentAnnualPrize", "Realtor annual prize ($, 0 = none)"],
  ];
  return (
    <form onSubmit={a} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      {fields.map(([k, l]) => <div key={k}><label className="label">{l}</label><input name={k} type="number" min={0} defaultValue={values[k]} className="input" /></div>)}
      <div className="space-y-2 sm:col-span-2"><Msg state={s} /><Submit pending={pending}>Save settings</Submit></div>
    </form>
  );
}

export function ListingAgentForm({ p }: { p?: Record<string, string | null> }) {
  const { state: s, onSubmit: a, pending } = useForm(saveListingAgentAction);
  const v = (k: string) => p?.[k] ?? "";
  return (
    <form onSubmit={a} className="grid gap-3 sm:grid-cols-2">
      {p?.id && <input type="hidden" name="id" value={p.id} />}
      <div><label className="label">Name</label><input name="displayName" defaultValue={v("displayName")} required className="input" /></div>
      <div><label className="label">Brokerage</label><input name="brokerage" defaultValue={v("brokerage")} required className="input" /></div>
      <div><label className="label">Phone</label><input name="phone" defaultValue={v("phone")} className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" defaultValue={v("email")} className="input" /></div>
      <div><label className="label">Website</label><input name="website" type="url" defaultValue={v("website")} className="input" /></div>
      <div><label className="label">Photo URL</label><input name="photoUrl" type="url" defaultValue={v("photoUrl")} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">…or upload photo</label><input name="photo" type="file" accept="image/*" className="text-sm" /></div>
      <div className="sm:col-span-2"><label className="label">Bio</label><textarea name="bio" rows={2} defaultValue={v("bio")} className="input" /></div>
      <div className="space-y-2 sm:col-span-2"><Msg state={s} /><Submit pending={pending}>{p?.id ? "Save agent" : "Add agent"}</Submit></div>
    </form>
  );
}
