import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "How It Works & Official Rules" };

export default async function HowItWorks() {
  const s = await getSettings();
  const steps = [
    ["1", "New homes every Saturday", "Every Saturday at 3:00 AM, at least two homes that are currently under contract go live. Guessing stays open until Friday at 11:59 PM."],
    ["2", "Research & guess", "Study the photos, details, agent videos and comparable sales on our MLS sister site, then submit your guess of the final sale price."],
    ["3", "Watch the pending phase", "When guessing closes, everyone's guesses are revealed so you can see where you stand while the sale is pending."],
    ["4", "Home closes → winner picked", `When the sale closes and the price is public record, the closest guess wins ${money(s.gamePrize)}. Everyone gets an email with their result.`],
  ];
  return (
    <div className="container-x max-w-4xl py-10">
      <h1 className="h-section">How It Works</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {steps.map(([n, t, d]) => (
          <div key={n} className="card flex gap-4 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-lg font-black text-white">{n}</span>
            <div><h2 className="font-bold">{t}</h2><p className="mt-1 text-sm text-slate-600">{d}</p></div>
          </div>
        ))}
      </div>
      <div className="card mt-8 p-6 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-bold text-navy-900">Prizes & Rules</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li><b>Game prize:</b> the public player whose guess is closest to the final sale price wins {money(s.gamePrize)}. Ties go to the earliest guess.</li>
          <li><b>Annual grand prize:</b> the #1 player on the public ladder at the end of the calendar year wins {money(s.annualPrize)}.</li>
          <li><b>Ladder points:</b> every finished game you play earns 1 point, plus 10 for 1st, 7 for 2nd, 5 for 3rd, 3 for 4th–5th and 2 for 6th–10th. Ties on points go to the lowest average error.</li>
          <li><b>Streaks:</b> a streak counts consecutive games where your best guess was within 5% of the final price.</li>
          <li><b>Guesses:</b> every player gets {s.baseGuesses} guess{s.baseGuesses > 1 ? "es" : ""} per home. Users of our MLS comps site get +{s.mlsBonusGuesses}, and PriceMortgageRight.com users get +{s.mortgageBonusGuesses}. Your closest guess counts.</li>
          <li><b>Realtors</b> compete on their own Realtor Leaderboard and are not eligible for the public game prizes.</li>
          <li>Other players&apos; guesses are hidden until guessing closes.</li>
          <li>Agents may post videos about themselves, the home and negotiation tactics, but may never mention price.</li>
          <li>One account per person. Duplicate accounts are disqualified. No purchase necessary.</li>
        </ul>
      </div>
      <div className="mt-8 flex gap-3"><Link href="/register" className="btn-green">Create free account</Link><Link href="/games" className="btn-outline">See current games</Link></div>
    </div>
  );
}
