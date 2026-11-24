"use client";
import { useState } from "react";
import {
  sendMarketingAction, smsAction,
  addVideoAction, closeGameAction, saveGameAction, saveListingAgentAction, saveSettingsAction,
} from "@/app/actions/admin";
import { Msg, Submit, useForm } from "./ui";
import { PRO_CATEGORIES } from "@/lib/pro";

type GameDefaults = Record<string, string | number | boolean | null | undefined>;

export function GameForm({ g, agents, tzLabel }: { g: GameDefaults; agents: { id: string; label: string }[]; tzLabel: string }) {
  const { state: s, onSubmit: a, pending } = useForm(saveGameAction);
  const v = (k: string) => (g[k] == null ? "" : String(g[k]));
  const lotRaw = v("lotSize");
  const lotParts = { value: (lotRaw.match(/[\d.]+/) || [""])[0], unit: /sq|ft/i.test(lotRaw) ? "sq ft" : "acres" };
  const [videoRows, setVideoRows] = useState(3);
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
        <div className="sm:col-span-2"><label className="label">Lot size</label>
          <div className="flex gap-2">
            <input name="lotSizeValue" type="number" step="any" min="0" defaultValue={lotParts.value} placeholder="0.25" className="input" />
            <select name="lotSizeUnit" defaultValue={lotParts.unit} className="input w-28"><option value="acres">acres</option><option value="sq ft">sq ft</option></select>
          </div>
        </div>
        {F({ name: "propertyType", label: "Property type", ph: "Single Family", span: "sm:col-span-2", })}
        {F({ name: "mlsNumber", label: "MLS #", span: "sm:col-span-2", })}
        {F({ name: "mlsUrl", label: "Link to listing / comps on MLS sister site", type: "url", ph: "https://", span: "sm:col-span-6" })}
        <div className="sm:col-span-6"><label className="label">Features (comma or one per line)</label><textarea name="features" rows={2} defaultValue={v("features")} placeholder="Hardwood floors, updated kitchen, large backyard" className="input" /></div>
        <div className="sm:col-span-6"><label className="label">Description</label><textarea name="description" rows={4} defaultValue={v("description")} className="input" /></div>
        <div className="sm:col-span-3"><label className="label">Listing agent (seller&apos;s agent)</label>
          <select name="listingAgentId" defaultValue={v("listingAgentId")} className="input"><option value="">— None —</option>{agents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
        <div className="sm:col-span-3"><label className="label">Buyer&apos;s agent</label>
          <select name="buyerAgentId" defaultValue={v("buyerAgentId")} className="input"><option value="">— None —</option>{agents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
        </div>
        <p className="-mt-2 text-xs text-slate-500 sm:col-span-6">Both agents are shown on the game page with a link to their page. Add new agents under Admin → Agents &amp; Professionals.</p>
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
      {!g.id && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-bold uppercase text-slate-500">Add videos (optional)</legend>
          <p className="text-xs text-slate-500">Paste YouTube, Vimeo or .mp4 links. Leave a row empty to skip it. Videos must not mention the price. Closing videos only show after the game is closed.</p>
          {Array.from({ length: videoRows }, (_, i) => i).map((i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
              <div className="sm:col-span-3"><label className="label">Type</label>
                <select name={`video_type_${i}`} defaultValue={["AGENT_PROMO", "WALKTHROUGH", "CLOSING"][i] ?? "WALKTHROUGH"} className="input">
                  <option value="AGENT_PROMO">Agent promo / neighborhood intro</option>
                  <option value="WALKTHROUGH">Property walkthrough & features</option>
                  <option value="CLOSING">Closing & negotiation (after close)</option>
                </select>
              </div>
              <div className="sm:col-span-3"><label className="label">Title</label><input name={`video_title_${i}`} className="input" placeholder="Meet the Agent" /></div>
              <div className="sm:col-span-4"><label className="label">Video link</label><input name={`video_url_${i}`} type="url" className="input" placeholder="https://youtube.com/watch?v=…" /></div>
              <div className="sm:col-span-2"><label className="label">Agent</label>
                <select name={`video_agent_${i}`} className="input"><option value="">— None —</option>{agents.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
              </div>
            </div>
          ))}
          {videoRows < 20 && <button type="button" onClick={() => setVideoRows(videoRows + 1)} className="btn-outline btn-sm">+ Add another video</button>}
          <p className="text-xs text-slate-500">You can add several videos of the same type. They appear in this order; you can reorder them later on the game&apos;s Manage page.</p>
        </fieldset>
      )}
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
    ["agentGamePrize", "Pro prize per game ($, 0 = none)"],
    ["agentAnnualPrize", "Pro annual prize ($, 0 = none)"],
    ["maxPerHousehold", "Max players per household"],
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
      <div><label className="label">Category</label>
        <select name="category" defaultValue={v("category") || "AGENT"} className="input">{Object.entries(PRO_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <div><label className="label">Brokerage / company</label><input name="brokerage" defaultValue={v("brokerage")} required className="input" /></div>
      <div className="grid grid-cols-3 gap-3"><div className="col-span-2"><label className="label">City</label><input name="companyCity" defaultValue={v("companyCity")} className="input" /></div><div><label className="label">State</label><input name="licenseState" maxLength={2} defaultValue={v("licenseState")} className="input uppercase" /></div></div>
      <div><label className="label">Phone</label><input name="phone" defaultValue={v("phone")} className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" defaultValue={v("email")} className="input" /></div>
      <div><label className="label">Their page / website</label><input name="website" defaultValue={v("website")} placeholder="www.linktr.ee/name" className="input" /></div>
      <div><label className="label">Photo URL</label><input name="photoUrl" defaultValue={v("photoUrl")} placeholder="https://…" className="input" /></div>
      <div className="sm:col-span-2"><label className="label">…or upload photo</label><input name="photo" type="file" accept="image/*" className="text-sm" /></div>
      <div className="sm:col-span-2"><label className="label">Bio</label><textarea name="bio" rows={2} defaultValue={v("bio")} className="input" /></div>
      <div className="space-y-2 sm:col-span-2"><Msg state={s} /><Submit pending={pending}>{p?.id ? "Save agent" : "Add agent"}</Submit></div>
    </form>
  );
}

export function MarketingForm({ address, optedIn }: { address: string; optedIn: number }) {
  const { state: s, onSubmit, pending } = useForm(sendMarketingAction);
  const [mode, setMode] = useState<"test" | "all">("test");
  return (
    <form
      onSubmit={(e) => {
        const m = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
        if (m === "all" && !confirm(`Send this email to all ${optedIn} subscribed players?`)) { e.preventDefault(); return; }
        setMode(m === "all" ? "all" : "test");
        onSubmit(e);
      }}
      className="space-y-4"
    >
      <div><label className="label">Subject</label><input name="subject" required className="input" placeholder="New homes are live — guess the price and win $100!" /></div>
      <div><label className="label">Message</label><textarea name="message" required rows={8} className="input" placeholder={"This week's games are open...\n\nLeave a blank line between paragraphs."} /><p className="mt-1 text-xs text-slate-500">Each email starts with &quot;Hi &lt;first name&gt;,&quot; automatically. Blank lines make new paragraphs.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Button text (optional)</label><input name="ctaLabel" className="input" placeholder="Play this week's games" /></div>
        <div><label className="label">Button link (optional)</label><input name="ctaUrl" type="url" className="input" placeholder="https://www.pricerealestateright.com" /></div>
      </div>
      <div><label className="label">Business mailing address (required by law in every promotional email)</label><textarea name="mailingAddress" required rows={2} defaultValue={address} className="input" placeholder={"PriceRealEstateRight LLC\n123 Main St, Austin, TX 78701"} /></div>
      <Msg state={s} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="mode" value="test" disabled={pending} className="btn-outline">{pending && mode === "test" ? "Sending…" : "Send test to me"}</button>
        <button type="submit" name="mode" value="all" disabled={pending || optedIn === 0} className="btn-green">{pending && mode === "all" ? "Sending…" : `Send to ${optedIn} subscribed player${optedIn === 1 ? "" : "s"}`}</button>
      </div>
    </form>
  );
}

export function SmsTestForm() {
  const { state: s, onSubmit, pending } = useForm(smsAction);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="op" value="test" />
      <div><label className="label">Your mobile number</label><input name="phone" type="tel" required className="input max-w-xs" placeholder="(555) 123-4567" /></div>
      <Msg state={s} />
      <Submit pending={pending} className="btn-outline" pendingText="Sending…">Send test text</Submit>
    </form>
  );
}

export function SmsAnnounceForm({ players }: { players: number }) {
  const { state: s, onSubmit, pending } = useForm(smsAction);
  return (
    <form onSubmit={(e) => { if (!confirm(`Text ${players} player(s) about games that are open now?`)) { e.preventDefault(); return; } onSubmit(e); }} className="space-y-3">
      <input type="hidden" name="op" value="announce" />
      <Msg state={s} />
      <Submit pending={pending} pendingText="Sending…">Text players about new games now</Submit>
    </form>
  );
}
