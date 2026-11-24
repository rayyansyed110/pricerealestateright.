import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { START_WORDS, STOP_WORDS, validTwilioSignature } from "@/lib/sms";

export const dynamic = "force-dynamic";
const twiml = (msg?: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${msg ? `<Message>${msg}</Message>` : ""}</Response>`, { headers: { "Content-Type": "text/xml" } });

/**
 * Twilio "A message comes in" webhook. Twilio itself blocks texts after STOP;
 * this keeps the player's text settings in our database in sync.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => { params[k] = String(v); });
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const url = base ? base + new URL(req.url).pathname : req.url;
  if (!validTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) return new Response("Forbidden", { status: 403 });

  const word = (params.Body || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const last10 = (params.From || "").replace(/\D/g, "").slice(-10);
  if (last10.length !== 10) return twiml();
  const match = sql`right(regexp_replace(coalesce(${schema.users.phone}, ''), '\\D', '', 'g'), 10) = ${last10}`;
  if (STOP_WORDS.includes(word)) {
    await db.update(schema.users).set({ smsConsent: false, smsGameAlerts: false, smsWinNotify: false }).where(match);
  } else if (START_WORDS.includes(word)) {
    await db.update(schema.users).set({ smsConsent: true }).where(match);
  }
  return twiml(); // Twilio sends its own STOP/START/HELP confirmations
}
