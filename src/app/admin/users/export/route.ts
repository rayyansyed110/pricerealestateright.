import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // quote, and neutralise spreadsheet formulas
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

/** GET /admin/users/export?optin=1 → CSV of users (admins only). */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const optinOnly = new URL(req.url).searchParams.get("optin") === "1";
  const counts = await db.select({ id: schema.guesses.userId, n: sql<number>`count(*)::int` }).from(schema.guesses).groupBy(schema.guesses.userId);
  const c = new Map(counts.map((x) => [x.id, x.n]));
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  const rows = users.filter((u) => !u.disabled && (!optinOnly || u.marketingOptIn));
  const header = ["First name", "Last name", "Email", "Phone", "City", "Realtor", "Opted in to emails", "Guesses", "Joined"];
  const lines = [header.map(csv).join(","), ...rows.map((u) => [
    u.firstName, u.lastName, u.email, u.phone, u.city, u.agentStatus === "APPROVED" ? "yes" : "no",
    u.marketingOptIn ? "yes" : "no", c.get(u.id) ?? 0, u.createdAt.toISOString().slice(0, 10),
  ].map(csv).join(","))];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="players${optinOnly ? "-opted-in" : ""}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
