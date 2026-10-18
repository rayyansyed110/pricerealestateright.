"use client";
import Link from "next/link";
import { useState } from "react";
import {
  changePasswordAction, forgotPasswordAction, loginAction, registerAction, resetPasswordAction, updateProfileAction,
} from "@/app/actions/auth";
import { Msg, Submit, useForm } from "./ui";

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
  const [isAgent, setIsAgent] = useState(!!agent);
  return (
    <form onSubmit={a} className="space-y-4">
      <input type="hidden" name="next" value={next || "/"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">First name</label><input name="firstName" required autoComplete="given-name" className="input" /></div>
        <div><label className="label">Last name</label><input name="lastName" required autoComplete="family-name" className="input" /></div>
      </div>
      <div><label className="label">Email</label><input name="email" type="email" required autoComplete="email" className="input" /></div>
      <div><label className="label">Password</label><input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /><p className="mt-1 text-xs text-slate-500">At least 8 characters with a letter and a number.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Phone <span className="text-slate-400">(optional, for prize payouts)</span></label><input name="phone" type="tel" autoComplete="tel" className="input" /></div>
        <div><label className="label">City <span className="text-slate-400">(optional)</span></label><input name="city" autoComplete="address-level2" className="input" /></div>
      </div>
      <label className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-medium">
        <input type="checkbox" name="isAgent" checked={isAgent} onChange={(e) => setIsAgent(e.target.checked)} /> I&apos;m a licensed real estate agent (compete on the Realtor Leaderboard)
      </label>
      {isAgent && (
        <div className="grid gap-4 rounded-lg border border-blue-200 p-3 sm:grid-cols-3">
          <div className="sm:col-span-3"><label className="label">Brokerage</label><input name="brokerage" required className="input" /></div>
          <div className="sm:col-span-2"><label className="label">License #</label><input name="licenseNumber" className="input" /></div>
          <div><label className="label">State</label><input name="licenseState" className="input" /></div>
          <p className="text-xs text-slate-500 sm:col-span-3">Agent accounts are reviewed by our team before appearing on the Realtor Leaderboard.</p>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required className="mt-1" /> I am 18 or older and agree to the <Link href="/how-it-works" className="text-blue-600 underline" target="_blank">game rules</Link>.</label>
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

export function ProfileForm({ u }: { u: { firstName: string; lastName: string; phone: string | null; city: string | null; marketingOptIn: boolean } }) {
  const { state: s, onSubmit: a, pending } = useForm(updateProfileAction);
  return (
    <form onSubmit={a} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">First name</label><input name="firstName" defaultValue={u.firstName} required className="input" /></div>
        <div><label className="label">Last name</label><input name="lastName" defaultValue={u.lastName} required className="input" /></div>
        <div><label className="label">Phone</label><input name="phone" defaultValue={u.phone ?? ""} className="input" /></div>
        <div><label className="label">City</label><input name="city" defaultValue={u.city ?? ""} className="input" /></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="marketingOptIn" defaultChecked={u.marketingOptIn} /> Email me when new games go live</label>
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
