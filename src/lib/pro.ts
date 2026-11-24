/** Professional categories offered at sign-up. "Realtor" is a trademark, so the site says "real estate professional". */
export const PRO_CATEGORIES = {
  AGENT: "Real Estate Agent / Broker",
  LAWYER: "Real Estate Lawyer",
  INSPECTOR: "Home Inspector",
  INSURANCE: "Insurance",
  MORTGAGE: "Mortgage",
  TITLE: "Title",
  OTHER: "Other real estate professional",
} as const;
export type ProCategory = keyof typeof PRO_CATEGORIES;
export const isProCategory = (v: unknown): v is ProCategory => typeof v === "string" && v in PRO_CATEGORIES;
export const proCategoryLabel = (v: string | null | undefined) => (v && isProCategory(v) ? PRO_CATEGORIES[v] : "Real estate professional");

/** Accepts "www.site.com", "linktr.ee/x" or full URLs and returns a safe https URL, or null if it isn't a web address. */
export function normalizeUrl(input: string | null | undefined): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
