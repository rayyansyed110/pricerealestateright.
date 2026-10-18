"use client";
import { useState } from "react";

export function Gallery({ photos, alt }: { photos: { id: string; url: string; caption: string | null }[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!photos.length) return <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-slate-200 text-slate-500">Photos coming soon</div>;
  const p = photos[i];
  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-200">
        <img src={p.url} alt={p.caption || alt} className="h-full w-full object-cover" />
        {photos.length > 1 && (
          <>
            <button onClick={() => setI((i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Previous photo">‹</button>
            <button onClick={() => setI((i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Next photo">›</button>
            <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1} / {photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((ph, j) => (
            <button key={ph.id} onClick={() => setI(j)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-md ring-2 ${j === i ? "ring-blue-600" : "ring-transparent opacity-70 hover:opacity-100"}`}>
              <img src={ph.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
