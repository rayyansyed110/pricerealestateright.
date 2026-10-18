export type Embed = { kind: "iframe" | "file"; src: string };

export function toEmbed(url: string): Embed {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop();
      return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return { kind: "iframe", src: `https://player.vimeo.com/video/${id}` };
    }
  } catch {}
  return { kind: "file", src: url };
}

export const VIDEO_LABELS = {
  AGENT_PROMO: "Meet the Agent & Neighborhood Intro",
  WALKTHROUGH: "Property Walkthrough & Features Tour",
  CLOSING: "Closing & Negotiation Walkthrough",
} as const;
