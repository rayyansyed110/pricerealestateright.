"use client";
import { useEffect, useState } from "react";

function fmt(ms: number) {
  if (ms <= 0) return "Closed";
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

export function Countdown({ to, prefix = "Closes in" }: { to: string; prefix?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-red-600">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
      {now == null ? prefix : now >= target ? "Closed" : `${prefix} ${fmt(target - now)}`}
    </span>
  );
}
