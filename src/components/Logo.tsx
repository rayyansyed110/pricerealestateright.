export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 4 3 18h5v17h24V18h5L20 4Z" fill="#fff" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="27" y="6" width="4" height="8" fill="#22c55e" />
      <text x="20" y="31" textAnchor="middle" fontSize="15" fontWeight="800" fill="#16a34a" fontFamily="Arial">$</text>
    </svg>
  );
}
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
        PriceRealEstate<span className="text-green-400">Right</span><span className="text-slate-300">.com</span>
      </span>
    </span>
  );
}
