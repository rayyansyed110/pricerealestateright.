import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/AdminForms";

export default async function SettingsPage() {
  const s = await getSettings();
  const app = process.env.APP_URL;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <section className="card p-6"><SettingsForm s={s} /></section>
      <section className="card p-6 text-sm">
        <h2 className="font-bold">Sister-site bonus integration</h2>
        <p className="mt-1 text-slate-600">Bonus guesses are unlocked when a user&apos;s email is reported by a sister site. You can also toggle bonuses by hand on the Users page. Have the sister sites call:</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-green-300">{`POST ${app}/api/sister-sites/verify
Authorization: Bearer <SISTER_SITE_SECRET>
Content-Type: application/json

{ "email": "player@example.com", "site": "mls" }      // or "mortgage"`}</pre>
      </section>
    </div>
  );
}
