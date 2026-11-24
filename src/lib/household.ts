const ABBR: Record<string, string> = {
  street: "st", avenue: "ave", av: "ave", road: "rd", drive: "dr", lane: "ln", boulevard: "blvd", court: "ct",
  place: "pl", terrace: "ter", circle: "cir", parkway: "pkwy", highway: "hwy", square: "sq", trail: "trl", way: "way",
  north: "n", south: "s", east: "e", west: "w", northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
  apartment: "apt", suite: "ste", unit: "unit", "#": "unit", floor: "fl",
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => ABBR[w] ?? w).join(" ");

/**
 * A household = same street address + apartment/unit + ZIP. Used to enforce "max 2 players per household".
 * "12 Main Street Apt 3" and "12 main st., apartment 3" give the same key.
 */
export function householdKey(line1: string, line2: string | null | undefined, zip: string) {
  const unit = norm(line2 || "").replace(/^(apt|ste|unit|fl)\s*/, "");
  return [norm(line1), unit, zip.trim().slice(0, 5)].join("|");
}
