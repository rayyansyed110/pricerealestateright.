"use client";
import Link from "next/link";
import { useState } from "react";
import {
  changePasswordAction, forgotPasswordAction, loginAction, registerAction, resetPasswordAction, updateProfileAction,
} from "@/app/actions/auth";
import { Msg, Submit, useForm } from "./ui";
import { PRO_CATEGORIES } from "@/lib/pro";

export function LoginForm({ next }: { next?: string }) {
  const { state: s, onSubmit: a, pending } = useForm(loginAction);
  return (
    <form onSubmit={a} className="space-y-4">
      <input type="hidden" name="next" value={next || "/"} />
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
      <Msg state={s} />
      <Submit pending={pending} className="btn-green w-full" pendingText="Signing in…">Sign In</Submit>
      <div className="flex justify-between text-sm"><Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link><Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-blue-600 hover:underline">Create account</Link></div>
    </form>
  );
}

export function RegisterForm({ next, agent }: { next?: string; agent?: boolean }) {
  const { state: s, onSubmit: a, pending } = useForm(registerAction);
  const [isPro, setIsPro] = useState(!!agent);
  const [cat, setCat] = useState<string>("AGENT");
  const isAgentCat = cat === "AGENT";
  return (
    <form onSubmit={a} className="space-y-4">
      <input type="hidden" name="next" value={next || "/"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">First name</label><input name="firstName" required autoComplete="given-name" className="input" /></div>
        <div><label className="label">Last name</label><input name="lastName" required autoComplete="family-name" className="input" /></div>
      </div>
      <div><label className="label">Email</label><input name="email" type="email" required autoComplete="email" className="input" /></div>
      <div><label className="label">Password</label><input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /><p className="mt-1 text-xs text-slate-500">At least 8 characters with a letter and a number.</p></div>

      <fieldset className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-6">
        <legend className="px-1 text-sm font-semibold text-slate-700">Home address</legend>
        <div className="sm:col-span-4"><label className="label">Street address</label><input name="addressLine1" required autoComplete="address-line1" className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Apt / Unit <span className="text-slate-400">(optional)</span></label><input name="addressLine2" autoComplete="address-line2" className="input" /></div>
        <div className="sm:col-span-3"><label className="label">City</label><input name="city" required autoComplete="address-level2" className="input" /></div>
        <div className="sm:col-span-1"><label className="label">State</label><input name="state" required maxLength={2} placeholder="TX" autoComplete="address-level1" className="input uppercase" /></div>
        <div className="sm:col-span-2"><label className="label">ZIP</label><input name="zip" required inputMode="numeric" autoComplete="postal-code" className="input" /></div>
        <p className="text-xs text-slate-500 sm:col-span-6">Limit 2 players per household.</p>
      </fieldset>

      <div><label className="label">Mobile phone</label><input name="phone" type="tel" required autoComplete="tel" placeholder="(555) 555-5555" className="input" /></div>
      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <label className="flex items-start gap-2"><input type="checkbox" name="smsConsent" required className="mt-1" /> <span>I agree to receive text messages from <b>www.PriceRealEstateRight.com</b> and from our affiliates. Msg &amp; data rates may apply. Reply STOP to opt out.</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" name="smsGameAlerts" className="mt-1" /> <span><span className="text-slate-500">(Optional)</span> Text me when new games start every week and with updates on the games I play.</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" name="smsWinNotify" className="mt-1" /> <span><span className="text-slate-500">(Optional)</span> Please notify me via text/call when I win!</span></label>
      </div>

      <label className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-medium">
        <input type="checkbox" name="isPro" checked={isPro} onChange={(e) => setIsPro(e.target.checked)} /> I&apos;m a real estate professional (compete on the Pro Leaderboard)
      </label>
      {isPro && (
        <div className="grid gap-4 rounded-lg border border-blue-200 p-3 sm:grid-cols-6">
          <div className="sm:col-span-6"><label className="label">Category</label>
            <select name="proCategory" value={cat} onChange={(e) => setCat(e.target.value)} className="input">
              {Object.entries(PRO_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className={isAgentCat ? "sm:col-span-6" : "sm:col-span-4"}><label className="label">{isAgentCat ? "Brokerage name" : "Company name"}</label><input name="company" required className="input" /></div>
          {isAgentCat && <div className="sm:col-span-4"><label className="label">Brokerage city</label><input name="companyCity" required className="input" /></div>}
          <div className="sm:col-span-2"><label className="label">{isAgentCat ? "Brokerage state" : "State"}</label><input name="companyState" required maxLength={2} placeholder="TX" className="input uppercase" /></div>
          {isAgentCat && (
            <>
              <div className="sm:col-span-3"><label className="label">License # <span className="text-slate-400">(optional)</span></label><input name="licenseNumber" className="input" /></div>
              <div className="sm:col-span-3"><label className="label">Include my brokerage on the Brokerage Leaderboard?</label>
                <div className="flex gap-4 pt-2 text-sm">
                  <label className="flex items-center gap-1"><input type="radio" name="brokerageLeaderboard" value="yes" required /> Yes</label>
                  <label className="flex items-center gap-1"><input type="radio" name="brokerageLeaderboard" value="no" /> No</label>
                </div>
              </div>
            </>
          )}
          <p className="text-xs text-slate-500 sm:col-span-6">Professional accounts are reviewed by our team before appearing on the Pro Leaderboard.</p>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="insider" required className="mt-1" /> <span>I agree that I do not have insider information on the price of properties in contract, or any other insider information that would give me a leg up on others.</span></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required className="mt-1" /> <span>I am 18 or older and agree to the <Link href="/how-it-works" className="text-blue-600 underline" target="_blank">game rules</Link>, including the limit of 2 players per household.</span></label>
      <p className="text-xs text-slate-500">By creating an account you&apos;ll receive game updates, new-listing alerts and promotional emails from PriceRealEstateRight. You can unsubscribe anytime from any email or your account page.</p>
      <Msg state={s} />
      <Submit pending={pending} className="btn-green w-full" pendingText="Creating account…">Create Account</Submit>
      <p className="text-center text-sm">Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-blue-600 hover:underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const { state: s, onSubmit: a, pending } = useForm(forgotPasswordAction);
  return (
    <form onSubmit={a} className="space-y-4">
      <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
      <Msg state={s} />
      <Submit pending={pending} className="btn-green w-full" pendingText="Sending…">Send reset link</Submit>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { state: s, onSubmit: a, pending } = useForm(resetPasswordAction);
  return (
    <form onSubmit={a} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div><label className="label">New password</label><input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></div>
      <Msg state={s} />
      <Submit pending={pending} className="btn-green w-full">Set new password</Submit>
    </form>
  );
}

type ProfileU = { firstName: string; lastName: string; phone: string | null; marketingOptIn: boolean; smsConsent: boolean; smsGameAlerts: boolean; smsWinNotify: boolean };
export function ProfileForm({ u }: { u: ProfileU }) {
  const { state: s, onSubmit: a, pending } = useForm(updateProfileAction);
  return (
    <form onSubmit={a} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">First name</label><input name="firstName" defaultValue={u.firstName} required className="input" /></div>
        <div><label className="label">Last name</label><input name="lastName" defaultValue={u.lastName} required className="input" /></div>
        <div className="sm:col-span-2"><label className="label">Mobile phone</label><input name="phone" type="tel" defaultValue={u.phone ?? ""} className="input" /></div>
      </div>
      <div className="space-y-1 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="marketingOptIn" defaultChecked={u.marketingOptIn} /> Email me news, new-game alerts and promotions</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="smsConsent" defaultChecked={u.smsConsent} /> Text messages from PriceRealEstateRight and affiliates</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="smsGameAlerts" defaultChecked={u.smsGameAlerts} /> Text me when new games start and with game updates</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="smsWinNotify" defaultChecked={u.smsWinNotify} /> Text/call me when I win</label>
      </div>
      <Msg state={s} />
      <Submit pending={pending}>Save profile</Submit>
    </form>
  );
}

export function PasswordForm() {
  const { state: s, onSubmit: a, pending } = useForm(changePasswordAction);
  return (
    <form onSubmit={a} className="space-y-3">
      <div><label className="label">Current password</label><input name="current" type="password" required className="input" autoComplete="current-password" /></div>
      <div><label className="label">New password</label><input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></div>
      <Msg state={s} />
      <Submit pending={pending} className="btn-navy">Change password</Submit>
    </form>
  );
}
