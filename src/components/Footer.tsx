import Link from "next/link";
import { LogoMark } from "./Logo";

export function Footer() {
  const mls = process.env.NEXT_PUBLIC_MLS_SITE_URL, mort = process.env.NEXT_PUBLIC_MORTGAGE_SITE_URL;
  return (
    <footer className="mt-16 bg-navy-950 text-slate-300">
      <div className="container-x grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-white"><LogoMark className="h-7 w-7" /> PriceRealEstateRight.com</div>
          <p className="mt-3 text-slate-400">Guess the final sale price of homes under contract. Closest guess wins $100 every game, and the best player of the year wins $1,000.</p>
        </div>
        <div className="space-y-2">
          <div className="font-semibold text-white">Play</div>
          <Link href="/games" className="block hover:text-white">Current Games</Link>
          <Link href="/leaderboards" className="block hover:text-white">Leaderboards</Link>
          <Link href="/how-it-works" className="block hover:text-white">How It Works & Rules</Link>
          <Link href="/realtor-hub" className="block hover:text-white">Realtor Hub</Link>
        </div>
        <div className="space-y-2">
          <div className="font-semibold text-white">Sister Sites</div>
          <a href={mls} target="_blank" rel="noopener" className="block hover:text-white">MLS Comps & Listings ↗</a>
          <a href={mort} target="_blank" rel="noopener" className="block hover:text-white">PriceMortgageRight.com ↗</a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PriceRealEstateRight.com · No purchase necessary · Listing data deemed reliable but not guaranteed
      </div>
    </footer>
  );
}
