"use client";
import Link from "next/link";
import { useState } from "react";

export function MobileMenu({ links, signedIn, name, logout }: { links: { href: string; label: string }[]; signedIn: boolean; name?: string; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(!open)} className="rounded p-2 text-white" aria-label="Menu" aria-expanded={open}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-t border-white/10 bg-navy-900 px-4 pb-4 shadow-xl">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-slate-100">{l.label}</Link>)}
          {signedIn ? (
            <>
              <Link href="/account" onClick={() => setOpen(false)} className="block py-3 text-slate-100">My Account ({name})</Link>
              <form action={logout}><button className="py-3 text-slate-300">Sign out</button></form>
            </>
          ) : <Link href="/login" onClick={() => setOpen(false)} className="block py-3 font-semibold text-green-400">Sign In / Register</Link>}
        </div>
      )}
    </div>
  );
}
