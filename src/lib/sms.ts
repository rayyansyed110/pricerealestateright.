import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { db, schema } from "@/db";

/**
 * Text messages through Twilio (REST API, no SDK needed).
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and either TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_FROM_NUMBER.
 * Every text is recorded in the same log as emails (types start with "SMS_").
 */
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM_NUMBER;
const SERVICE = process.env.TWILIO_MESSAGING_SERVICE_SID;

export const smsConfigured = () => !!(SID && TOKEN && (FROM || SERVICE));

/** US/Canada phone → +1XXXXXXXXXX. Numbers already starting with + are kept. Returns null when it can't be a real number. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export type Sms = { to: string | null | undefined; body: string; type: string; gameId?: string };

const OPT_OUT_LINE = "Reply STOP to opt out.";

async function sendOne(to: string, body: string): Promise<void> {
  const params = new URLSearchParams({ To: to, Body: body });
  if (SERVICE) params.set("MessagingServiceSid", SERVICE);
  else params.set("From", FROM!);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { message?: string; code?: number } | null;
    throw new Error(j?.message ? `${j.message}${j.code ? ` (Twilio ${j.code})` : ""}` : `Twilio HTTP ${res.status}`);
  }
}

/** Sends texts (a few at a time) and logs each one. Returns how many went out. */
export async function sendSms(list: Sms[], opts: { optOutLine?: boolean } = {}) {
  const addLine = opts.optOutLine ?? true;
  let ok = 0;
  const rows: (typeof schema.emailLogs.$inferInsert)[] = [];
  const queue = list.map((m) => ({ ...m, to: toE164(m.to), body: addLine ? `${m.body} ${OPT_OUT_LINE}` : m.body }));
  for (let i = 0; i < queue.length; i += 5) {
    await Promise.all(queue.slice(i, i + 5).map(async (m) => {
      const subject = m.body.length > 180 ? m.body.slice(0, 177) + "…" : m.body;
      if (!m.to) { rows.push({ to: "(no valid phone)", subject, type: m.type, gameId: m.gameId, status: "failed", error: "Invalid phone number" }); return; }
      if (!smsConfigured()) { console.log(`[sms:not-configured] to=${m.to} "${m.body}"`); rows.push({ to: m.to, subject, type: m.type, gameId: m.gameId, status: "logged" }); ok++; return; }
      try { await sendOne(m.to, m.body); ok++; rows.push({ to: m.to, subject, type: m.type, gameId: m.gameId, status: "sent" }); }
      catch (e) { rows.push({ to: m.to, subject, type: m.type, gameId: m.gameId, status: "failed", error: (e as Error).message }); }
    }));
  }
  if (rows.length) await db.insert(schema.emailLogs).values(rows);
  return ok;
}

/** Checks the X-Twilio-Signature header on incoming webhooks so nobody else can fake them. */
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null) {
  if (!TOKEN || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT", "REVOKE"];
export const START_WORDS = ["START", "UNSTOP", "YES", "OPTIN"];
