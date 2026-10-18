import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

const NAV = [
  ["/admin", "Dashboard"], ["/admin/games", "Games / Listings"], ["/admin/videos", "Video Approvals"], ["/admin/users", "Users & Realtors"],
  ["/admin/agents", "Listing Agents"], ["/admin/payouts", "Winners & Payouts"], ["/admin/emails", "Email Log"], ["/admin/settings", "Settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="container-x grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <nav className="card h-fit p-2 lg:sticky lg:top-20">
        <div className="px-3 py-2 text-xs font-bold uppercase text-slate-400">Admin</div>
        {NAV.map(([h, l]) => <Link key={h} href={h} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100">{l}</Link>)}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
