import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

const NAV = [
  { href: "/games", label: "Current Games" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/realtor-hub", label: "Realtor Hub" },
];

export async function Header() {
  const user = await getCurrentUser();
  const links = [...NAV, ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : [])];
  return (
    <header className="sticky top-0 z-40 bg-navy-900 shadow-lg">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="PriceRealEstateRight home"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-200 lg:flex">
          {links.map((l) => <Link key={l.href} href={l.href} className="hover:text-white">{l.label}</Link>)}
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/account" className="rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">Hi, {user.firstName}</Link>
              <form action={logoutAction}><button className="text-slate-300 hover:text-white">Sign out</button></form>
            </div>
          ) : (
            <Link href="/login" className="hover:text-white">Sign In / Register</Link>
          )}
        </nav>
        <MobileMenu links={links} signedIn={!!user} name={user?.firstName} logout={logoutAction} />
      </div>
    </header>
  );
}
