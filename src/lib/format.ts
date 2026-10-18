import { formatInTimeZone } from "date-fns-tz";

export const TZ = process.env.GAME_TIMEZONE || "America/New_York";

export const money = (n: number | null | undefined) =>
  n == null ? "—" : "$" + Math.round(n).toLocaleString("en-US");

export const fmtDate = (d: Date | string | null | undefined, f = "MM/dd/yyyy") =>
  d ? formatInTimeZone(new Date(d), TZ, f) : "—";

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? formatInTimeZone(new Date(d), TZ, "EEE MMM d, h:mm a zzz") : "—";

export const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const initials = (first: string, last: string) => `${first} ${last.charAt(0)}.`;

export function timeLeft(to: Date, now = new Date()) {
  const ms = to.getTime() - now.getTime();
  if (ms <= 0) return "Closed";
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export function featureList(f: string | null | undefined) {
  return (f || "").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
}
