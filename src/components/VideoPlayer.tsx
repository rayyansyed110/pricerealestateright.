"use client";
import { useState } from "react";
import { toEmbed } from "@/lib/video";

export function VideoPlayer({ url, title, poster, agentPhoto, badge }: { url: string; title: string; poster?: string | null; agentPhoto?: string | null; badge?: string }) {
  const [playing, setPlaying] = useState(false);
  const e = toEmbed(url);
  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {e.kind === "iframe"
          ? <iframe src={`${e.src}?autoplay=1`} title={title} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          : <video src={e.src} controls autoPlay className="h-full w-full" />}
      </div>
    );
  }
  return (
    <button onClick={() => setPlaying(true)} className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-navy-900 text-left" aria-label={`Play video: ${title}`}>
      {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:scale-105" />}
      {agentPhoto && <img src={agentPhoto} alt="" className="absolute bottom-0 right-2 h-[85%] w-auto rounded-t-lg object-cover object-top" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/40" />
      <div className="absolute left-3 top-2 text-sm font-semibold text-white drop-shadow">{title}</div>
      {badge && <div className="absolute -right-10 top-5 rotate-45 bg-green-500 px-10 py-1 text-[11px] font-bold uppercase text-white shadow">{badge}</div>}
      <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/50 transition group-hover:scale-110">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </button>
  );
}
