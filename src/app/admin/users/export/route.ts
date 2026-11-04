import { desc, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const HEADERS = ["First name", "Last name", "Email", "Phone", "City", "Account type", "Subscribed to emails", "Guesses", "Joined"];

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // quote, and neutralise spreadsheet formulas
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

/**
 * GET /admin/users/export?format=xlsx|csv&list=marketing
 * Downloads every player (or only subscribed players with list=marketing) as Excel or CSV. Admins only.
 */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const marketingOnly = url.searchParams.get("list") === "marketing" || url.searchParams.get("optin") === "1";

  const counts = await db.select({ id: schema.guesses.userId, n: sql<number>`count(*)::int` }).from(schema.guesses).groupBy(schema.guesses.userId);
  const c = new Map(counts.map((x) => [x.id, x.n]));
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  const rows = users
    .filter((u) => !u.disabled && (!marketingOnly || u.marketingOptIn))
    .map((u) => [
      u.firstName, u.lastName, u.email, u.phone ?? "", u.city ?? "",
      u.role === "ADMIN" ? "Admin" : u.agentStatus === "APPROVED" ? "Realtor" : "Player",
      u.marketingOptIn ? "Yes" : "No (unsubscribed)", c.get(u.id) ?? 0, u.createdAt,
    ] as const);

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${marketingOnly ? "email-list" : "players"}-${stamp}`;

  if (format === "csv") {
    const lines = [HEADERS.map(csvCell).join(","), ...rows.map((r) => r.map((v, i) => csvCell(i === 8 ? (v as Date).toISOString().slice(0, 10) : v)).join(","))];
    return new Response("﻿" + lines.join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "PriceRealEstateRight";
  const ws = wb.addWorksheet(marketingOnly ? "Email list" : "Players", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { width: 16 }, { width: 18 }, { width: 34 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 14 },
  ];
  const head = ws.addRow(HEADERS);
  head.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2448" } };
    cell.alignment = { vertical: "middle" };
  });
  for (const r of rows) {
    const row = ws.addRow([...r]);
    row.font = { name: "Arial" };
    row.getCell(9).numFmt = "mm/dd/yyyy";
  }
  ws.autoFilter = { from: "A1", to: "I1" };
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}
