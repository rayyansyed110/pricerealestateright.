import "server-only";
import { Resend } from "resend";
import { db, schema } from "@/db";
import type { Game, User } from "@/db/schema";
import { createHmac, timingSafeEqual } from "crypto";
import { fmtDateTime, money } from "./format";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM = process.env.EMAIL_FROM || "PriceRealEstateRight <onboarding@resend.dev>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type Mail = { to: string; subject: string; html: string; type: string; gameId?: string; headers?: Record<string, string> };

// ---- unsubscribe links (signed, so nobody can unsubscribe someone else) ----
const unsubSecret = () => process.env.UNSUBSCRIBE_SECRET || process.env.SISTER_SITE_SECRET || process.env.DATABASE_URL || "dev";
export const unsubToken = (userId: string) => createHmac("sha256", unsubSecret()).update(`unsub:${userId}`).digest("hex").slice(0, 32);
export function verifyUnsubToken(userId: string, token: string) {
  const a = Buffer.from(unsubToken(userId)), b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubUrl = (userId: string) => `${APP_URL}/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const DEFAULT_FOOTER = `You're receiving this because you played a game on PriceRealEstateRight.com.<br/>
      Research comps on <a href="${process.env.NEXT_PUBLIC_MLS_SITE_URL}" style="color:#2563eb">our MLS site</a> and get a bonus guess next week.`;

function layout(title: string, body: string, cta?: { label: string; href: string }, footer = DEFAULT_FOOTER) {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#0f2448;padding:18px 24px;color:#fff;font-size:20px;font-weight:bold">PriceRealEstate<span style="color:#22c55e">Right</span>.com</td></tr>
    <tr><td style="padding:28px 24px">
      <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
      ${body}
      ${cta ? `<p style="margin:28px 0 8px"><a href="${cta.href}" style="background:#22c55e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">${cta.label}</a></p>` : ""}
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">
      ${footer}
    </td></tr>
  </table></td></tr></table></body></html>`;
}

async function deliver(mails: Mail[]) {
  let ok = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    let status = "logged";
    let error: string | null = null;
    if (resend) {
      try {
        const res = await resend.batch.send(chunk.map((m) => ({ from: FROM, to: m.to, subject: m.subject, html: m.html, headers: m.headers })));
        if (res.error) throw new Error(res.error.message);
        status = "sent";
      } catch (e) {
        status = "failed";
        error = (e as Error).message;
      }
    } else {
      for (const m of chunk) console.log(`[email:not-configured] to=${m.to} subject="${m.subject}"`);
    }
    if (status !== "failed") ok += chunk.length;
    await db.insert(schema.emailLogs).values(chunk.map((m) => ({ to: m.to, subject: m.subject, type: m.type, gameId: m.gameId, status, error })));
  }
  return ok;
}

export async function sendResultEmails(
  game: Game,
  recipients: { user: User; guess: number; type: "WON" | "OVERBID" | "UNDERBID"; isAgent: boolean }[],
) {
  const addr = `${game.address}, ${game.city}, ${game.state}`;
  const final = money(game.finalSalePrice);
  const link = `${APP_URL}/games/${game.slug}`;
  const mails: Mail[] = recipients.map(({ user, guess, type, isAgent }) => {
    const hi = `<p>Hi ${esc(user.firstName)},</p>`;
    const facts = `<p style="background:#f1f5f9;border-radius:8px;padding:12px 14px;line-height:1.6">
      <b>${esc(addr)}</b><br/>Final sale price: <b>${final}</b><br/>Your closest guess: <b>${money(guess)}</b>
      (${guess >= game.finalSalePrice! ? "+" : "−"}${money(Math.abs(guess - game.finalSalePrice!))})</p>`;
    if (type === "WON") {
      const prize = isAgent ? "" : `<p>You've won <b>${money(game.prizeAmount)}</b>! We'll reach out to you shortly about collecting your prize.</p>`;
      return { to: user.email, type, gameId: game.id, subject: `🎉 Congrats, you won! ${game.address} sold for ${final}`,
        html: layout("Congratulations — you won!", `${hi}<p>Your guess was the closest on the ${isAgent ? "Realtor leaderboard" : "public ladder"}.</p>${facts}${prize}`, { label: "See the final results", href: link }) };
    }
    if (type === "OVERBID") {
      return { to: user.email, type, gameId: game.id, subject: `Sorry, you overbid on ${game.address}`,
        html: layout("Sorry — you overbid and overpaid for your home", `${hi}<p>The home at ${esc(addr)} closed for less than you guessed. In real life, that's money left on the table!</p>${facts}<p>Study the comps and sharpen your negotiation skills for this week's games.</p>`, { label: "Play this week's games", href: APP_URL }) };
    }
    return { to: user.email, type, gameId: game.id, subject: `Sorry, you bid too low on ${game.address}`,
      html: layout("Sorry — you bid too low and lost the home of your dreams", `${hi}<p>The home at ${esc(addr)} sold for more than you guessed. Someone else got the keys this time.</p>${facts}<p>Check the comps and come back for this week's games.</p>`, { label: "Play this week's games", href: APP_URL }) };
  });
  return deliver(mails);
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const href = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await deliver([{ to, type: "PASSWORD_RESET", subject: "Reset your PriceRealEstateRight password",
    html: layout("Reset your password", `<p>Hi ${esc(name)},</p><p>Click the button below to choose a new password. This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`, { label: "Reset password", href }) }]);
}

export async function sendWelcomeEmail(to: string, name: string) {
  await deliver([{ to, type: "WELCOME", subject: "Welcome to PriceRealEstateRight — start guessing!",
    html: layout(`Welcome, ${esc(name)}!`, `<p>Every week starting Saturday 3 AM, new homes that are under contract go live. Guess the final sale price — the closest guess wins <b>$100</b>, and the best player of the year wins <b>$1,000</b>.</p><p>Tip: research comps on our MLS sister site to earn an extra guess on every game.</p>`, { label: "See this week's games", href: APP_URL }) }]);
}

export async function sendGuessConfirmation(user: { email: string; firstName: string }, game: Game, amount: number, left: number) {
  const link = `${APP_URL}/games/${game.slug}`;
  await deliver([{ to: user.email, type: "GUESS_CONFIRMATION", gameId: game.id,
    subject: `Your guess of ${money(amount)} for ${game.address} is locked in`,
    html: layout("Your guess is locked in!", `<p>Hi ${esc(user.firstName)},</p>
      <p>We got your guess for <b>${esc(game.address)}, ${esc(game.city)}, ${esc(game.state)}</b>.</p>
      <p style="background:#f1f5f9;border-radius:8px;padding:12px 14px;line-height:1.6">Your guess: <b>${money(amount)}</b><br/>Guessing closes: ${fmtDateTime(game.closesAt)}${left > 0 ? `<br/>Guesses left for this home: <b>${left}</b>` : ""}</p>
      <p>After guessing closes you'll be able to see how everyone else guessed. When the home's sale closes, we'll email you your result. The closest guess wins <b>${money(game.prizeAmount)}</b>.</p>`,
      { label: "View the game", href: link }) }]);
}

/** Promotional email to players who opted in. Includes a one-click unsubscribe link and the business mailing address (CAN-SPAM). */
export async function sendMarketingEmail(
  recipients: { id: string; email: string; firstName: string }[],
  subject: string, message: string, mailingAddress: string, cta?: { label: string; href: string },
) {
  const body = esc(message).split(/\n{2,}/).map((p) => `<p style="line-height:1.6">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  return deliver(recipients.map((r) => {
    const unsub = unsubUrl(r.id);
    const footer = `You're receiving this because you signed up for news from PriceRealEstateRight.com.<br/>
      <a href="${unsub}" style="color:#2563eb">Unsubscribe</a> from promotional emails.<br/>${esc(mailingAddress).replace(/\n/g, "<br/>")}`;
    return { to: r.email, type: "MARKETING", subject,
      headers: { "List-Unsubscribe": `<${unsub.replace("/unsubscribe?", "/api/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      html: layout(esc(subject), `<p>Hi ${esc(r.firstName)},</p>${body}`, cta, footer) };
  }));
}
