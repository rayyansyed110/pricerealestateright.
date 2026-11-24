import { desc, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { proCategoryLabel } from "@/lib/pro";

export const runtime = "nodejs";

const HEADERS = [
  "First name", "Last name", "Email", "Phone", "Street address", "Apt/Unit", "City", "State", "ZIP",
  "Account type", "Pro category", "Brokerage / company", "Brokerage leaderboard",
  "Subscribed to emails", "Texts OK", "Text: new games", "Text/call: wins", "Guesses", "Joined",
];

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
  const users = await db.query.users.findMany({ with: { agentProfile: true }, orderBy: desc(schema.users.createdAt) });
  const rows = users
    .filter((u) => !u.disabled && (!marketingOnly || u.marketingOptIn))
    .map((u) => {
      const yn = (b: boolean) => (b ? "Yes" : "No");
      const pro = u.agentProfile;
      return [
        u.firstName, u.lastName, u.email, u.phone ?? "", u.addressLine1 ?? "", u.addressLine2 ?? "", u.city ?? "", u.state ?? "", u.zip ?? "",
        u.role === "ADMIN" ? "Admin" : u.agentStatus === "APPROVED" ? "Real estate pro" : u.agentStatus === "PENDING" ? "Pro (pending)" : "Player",
        pro && u.agentStatus !== "NONE" ? proCategoryLabel(pro.category) : "",
        pro && u.agentStatus !== "NONE" ? [pro.brokerage, pro.companyCity, pro.licenseState].filter(Boolean).join(", ") : "",
        pro && u.agentStatus !== "NONE" && pro.category === "AGENT" ? yn(pro.brokerageLeaderboard) : "",
        u.marketingOptIn ? "Yes" : "No (unsubscribed)", yn(u.smsConsent), yn(u.smsGameAlerts), yn(u.smsWinNotify),
        c.get(u.id) ?? 0, u.createdAt,
      ] as const;
    });

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${marketingOnly ? "email-list" : "players"}-${stamp}`;

  if (format === "csv") {
    const lines = [HEADERS.map(csvCell).join(","), ...rows.map((r) => r.map((v, i) => csvCell(i === HEADERS.length - 1 ? (v as Date).toISOString().slice(0, 10) : v)).join(","))];
    return new Response("﻿" + lines.join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "PriceRealEstateRight";
  const ws = wb.addWorksheet(marketingOnly ? "Email list" : "Players", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [14, 16, 32, 16, 28, 10, 16, 7, 9, 16, 24, 30, 12, 20, 10, 14, 14, 9, 12].map((width) => ({ width }));
  const head = ws.addRow(HEADERS);
  head.eachCell((cell) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2448" } };
    cell.alignment = { vertical: "middle" };
  });
  for (const r of rows) {
    const row = ws.addRow([...r]);
    row.font = { name: "Arial" };
    row.getCell(HEADERS.length).numFmt = "mm/dd/yyyy";
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}
