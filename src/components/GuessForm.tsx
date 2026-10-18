"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { submitGuessAction } from "@/app/actions/guess";
import { Msg, Submit, useForm } from "./ui";

type Props = {
  gameId: string; slug: string; listPrice: number; signedIn: boolean;
  remaining: number; allowed: number; compact?: boolean;
};

export function GuessForm({ gameId, slug, listPrice, signedIn, remaining, allowed, compact }: Props) {
  const min = Math.round((listPrice * 0.7) / 1000) * 1000;
  const max = Math.round((listPrice * 1.3) / 1000) * 1000;
  const [value, setValue] = useState(listPrice);
  const [text, setText] = useState("");
  const { state: state, onSubmit: action, pending } = useForm(submitGuessAction);
  useEffect(() => { if (state?.ok) setText(""); }, [state]);
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;

  const onText = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "");
    setText(digits ? Number(digits).toLocaleString("en-US") : "");
    if (digits) setValue(Number(digits));
  };

  return (
    <form onSubmit={action} className={`space-y-3 rounded-xl ${compact ? "bg-blue-600 p-4" : "bg-gradient-to-b from-blue-600 to-blue-700 p-5"} text-white`}>
      <input type="hidden" name="gameId" value={gameId} />
      <input type="range" min={min} max={max} step={1000} value={Math.min(Math.max(value, min), max)}
        onChange={(e) => { setValue(Number(e.target.value)); setText(Number(e.target.value).toLocaleString("en-US")); }}
        className="guess-range w-full" style={{ ["--p" as string]: `${pct}%` }} aria-label="Guess slider" />
      <div className="flex justify-between text-[11px] text-blue-100"><span>${min.toLocaleString()}</span><span>${max.toLocaleString()}</span></div>
      <label className={`flex items-center justify-center gap-2 font-medium ${compact ? "flex-col text-sm" : "flex-wrap text-base"}`}>
        Enter Your Guess:
        <span className={`flex items-center rounded-md bg-white px-2 text-slate-900 ${compact ? "w-full" : ""}`}>
          $<input name="amount" inputMode="numeric" autoComplete="off" value={text} onChange={(e) => onText(e.target.value)} placeholder="_______" className={`${compact ? "w-full" : "w-32"} min-w-0 bg-transparent px-1 py-1.5 text-base outline-none`} required />
        </span>
      </label>
      {signedIn ? (
        remaining > 0 ? (
          <Submit pending={pending} className="btn-green w-full text-base" pendingText="Submitting…">Submit Guess</Submit>
        ) : (
          <div className="rounded-lg bg-white/15 py-2.5 text-center text-sm font-semibold">You&apos;ve used all {allowed} guess{allowed > 1 ? "es" : ""} ✓</div>
        )
      ) : (
        <Link href={`/login?next=/games/${slug}`} className="btn-green w-full text-base">{compact ? "Sign in to Guess" : "Sign in to Submit Guess"}</Link>
      )}
      {signedIn && remaining > 0 && <p className="text-center text-xs text-blue-100">{remaining} of {allowed} guess{allowed > 1 ? "es" : ""} left for this home</p>}
      <Msg state={state} />
    </form>
  );
}
