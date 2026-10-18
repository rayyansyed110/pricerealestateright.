/**
 * npm run db:seed            → creates/updates the admin account (ADMIN_EMAIL / ADMIN_PASSWORD)
 * npm run db:seed -- --demo  → also adds demo games, agents, players and guesses (for testing)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const DEMO = process.argv.includes("--demo");
const LOCAL_PHOTOS = process.env.SEED_LOCAL_PHOTOS; // e.g. "/api/files/demo" for offline testing

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;
const PHOTOS = {
  austin: [U("photo-1568605114967-8130f3a36994"), U("photo-1600585154340-be6161a56a0c"), U("photo-1556912173-3bb406ef7e77"), U("photo-1600566753190-17f0baa2a6c3")],
  miami: [U("photo-1613490493576-7fde63acd811"), U("photo-1600607687939-ce8a6c25118c"), U("photo-1600210492486-724fe5c67fb0")],
  denver: [U("photo-1570129477492-45c003edd2be"), U("photo-1600573472550-8090b5e0745e")],
  phoenix: [U("photo-1564013799919-ab600027ffc6"), U("photo-1600047509807-ba8f99d2cdde")],
};
const photos = (k: keyof typeof PHOTOS) => (LOCAL_PHOTOS ? PHOTOS[k].map((_, i) => `${LOCAL_PHOTOS}-${k}-${i}.png`) : PHOTOS[k]);

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!email || pw.length < 8) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env");
  const hash = await bcrypt.hash(pw, 12);
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) await db.update(schema.users).set({ role: "ADMIN", passwordHash: hash }).where(eq(schema.users.id, existing.id));
  else await db.insert(schema.users).values({ email, passwordHash: hash, firstName: "Site", lastName: "Admin", role: "ADMIN" });
  console.log(`✔ Admin ready: ${email}`);
  if (!DEMO) return;

  const day = 864e5, now = Date.now();
  const pwHash = await bcrypt.hash("Player123!", 12);
  const [agentUser] = await db.insert(schema.users).values({ email: "sarah.agent@example.com", passwordHash: pwHash, firstName: "Sarah", lastName: "Jenkins", role: "PLAYER", agentStatus: "APPROVED", city: "Austin" }).returning();
  const [sarah] = await db.insert(schema.agentProfiles).values({ userId: agentUser.id, displayName: "Sarah Jenkins", brokerage: "Austin Realty", email: "sarah.agent@example.com", phone: "512-555-0100", bio: "Neighborhood expert with 12 years in Central Austin. Ask me about negotiation tips for multiple-offer situations!" }).returning();
  const [marco] = await db.insert(schema.agentProfiles).values({ displayName: "Marco Diaz", brokerage: "Coastal Homes Miami", email: "marco@example.com", phone: "305-555-0199", bio: "Waterfront specialist." }).returning();

  const names = [["Damar", "Ross"], ["Donni", "Lane"], ["Maror", "Banks"], ["Revia", "Edwards"], ["Adham", "Gray"], ["Taylor", "Sohn"], ["Priya", "Shah"], ["Leo", "Kim"], ["Ana", "Lopez"], ["Ben", "Cole"]];
  const players = [];
  for (const [f, l] of names) {
    const [p] = await db.insert(schema.users).values({ email: `${f.toLowerCase()}@example.com`, passwordHash: pwHash, firstName: f, lastName: l, city: "Austin, TX", usedMlsComps: Math.random() > 0.5 }).returning();
    players.push(p);
  }
  const [agent2] = await db.insert(schema.users).values({ email: "mike.realtor@example.com", passwordHash: pwHash, firstName: "Mike", lastName: "Chen", agentStatus: "APPROVED" }).returning();
  await db.insert(schema.agentProfiles).values({ userId: agent2.id, displayName: "Mike Chen", brokerage: "Keystone Realty" });

  const mk = async (g: Partial<typeof schema.games.$inferInsert> & { slug: string; address: string; city: string; state: string; listPrice: number; beds: number; baths: number; sqft: number; opensAt: Date; closesAt: Date }, pics: string[]) => {
    const [row] = await db.insert(schema.games).values(g).returning();
    await db.insert(schema.photos).values(pics.map((url, i) => ({ gameId: row.id, url, sortOrder: i })));
    return row;
  };
  const sat = (offsetDays: number) => new Date(now + offsetDays * day);
  // this week's window: Saturday 3:00 AM -> Friday 11:59 PM (game timezone)
  const TZ = process.env.GAME_TIMEZONE || "America/New_York";
  const z = toZonedTime(new Date(), TZ);
  const back = (z.getDay() + 1) % 7;
  const wOpen = fromZonedTime(new Date(z.getFullYear(), z.getMonth(), z.getDate() - back, 3, 0), TZ);
  const wClose = fromZonedTime(new Date(z.getFullYear(), z.getMonth(), z.getDate() - back + 6, 23, 59), TZ);

  const austin = await mk({ slug: "124-maple-street-austin-tx", address: "124 Maple Street", city: "Austin", state: "TX", zip: "78704", listPrice: 465000, beds: 3, baths: 2.5, sqft: 2100, lastSoldPrice: 310000, lastSoldDate: new Date("2018-04-12T12:00:00Z"), yearBuilt: 2004, propertyType: "Single Family", lotSize: "0.21 acres", features: "Hardwood floors, Updated kitchen, Large backyard, Pending contract", description: "Charming two-story home on a tree-lined street minutes from downtown. Open floor plan, chef's kitchen with quartz counters, and a huge shaded backyard.", listingAgentId: sarah.id, opensAt: wOpen, closesAt: wClose }, photos("austin"));
  const miami = await mk({ slug: "88-ocean-drive-miami-fl", address: "88 Ocean Drive", city: "Miami", state: "FL", zip: "33139", listPrice: 1250000, beds: 4, baths: 3.5, sqft: 3200, lastSoldPrice: 820000, lastSoldDate: new Date("2016-09-01T12:00:00Z"), yearBuilt: 2015, propertyType: "Single Family", features: "Pool, Ocean views, Smart home, Impact windows", description: "Modern coastal living with a resort-style pool.", listingAgentId: marco.id, opensAt: wOpen, closesAt: wClose }, photos("miami"));
  await db.insert(schema.videos).values([
    { gameId: austin.id, agentId: sarah.id, type: "AGENT_PROMO", title: "Meet the Agent & Neighborhood Intro", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", approved: true, description: "Sarah talks about the 78704 neighborhood and what buyers love." },
  ]);
  const denver = await mk({ slug: "57-aspen-court-denver-co", address: "57 Aspen Court", city: "Denver", state: "CO", listPrice: 615000, beds: 3, baths: 2, sqft: 1850, lastSoldPrice: 402000, lastSoldDate: new Date("2017-06-20T12:00:00Z"), features: "Mountain views, Finished basement", opensAt: new Date(wOpen.getTime() - 7 * day), closesAt: new Date(wClose.getTime() - 7 * day) }, photos("denver"));
  const phoenix = await mk({ slug: "910-desert-sky-lane-phoenix-az", address: "910 Desert Sky Lane", city: "Phoenix", state: "AZ", listPrice: 389000, beds: 3, baths: 2, sqft: 1640, lastSoldPrice: 255000, lastSoldDate: new Date("2019-02-11T12:00:00Z"), features: "Solar panels, Pool, Xeriscape", opensAt: sat(-30), closesAt: sat(-23.5), finalSalePrice: 402500, saleClosedAt: sat(-3), resultsSentAt: sat(-3), listingAgentId: sarah.id }, photos("phoenix"));
  await db.insert(schema.videos).values({ gameId: phoenix.id, agentId: sarah.id, type: "CLOSING", title: "Closing & Negotiation Walkthrough", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", approved: true });

  const jitter = (base: number, pct: number) => Math.round((base * (1 + (Math.random() * 2 - 1) * pct)) / 500) * 500;
  for (const g of [denver, phoenix]) {
    for (const p of players) await db.insert(schema.guesses).values({ gameId: g.id, userId: p.id, amount: jitter(g.listPrice, 0.08), createdAt: new Date(g.opensAt.getTime() + Math.random() * 5 * day) });
    for (const a of [agentUser, agent2]) await db.insert(schema.guesses).values({ gameId: g.id, userId: a.id, amount: jitter(g.listPrice, 0.04), isAgent: true });
  }
  for (const p of players.slice(0, 6)) await db.insert(schema.guesses).values({ gameId: austin.id, userId: p.id, amount: jitter(465000, 0.06) });
  // pick winners for the closed demo game (no emails)
  const { rankGuesses } = await import("../src/lib/scoring");
  const gs = await db.select().from(schema.guesses).where(eq(schema.guesses.gameId, phoenix.id));
  const pub = rankGuesses(gs.filter((g) => !g.isAgent), 402500)[0];
  const ag = rankGuesses(gs.filter((g) => g.isAgent), 402500)[0];
  await db.insert(schema.gameWinners).values([
    { gameId: phoenix.id, userId: pub.userId, guessId: pub.id, isAgent: false, difference: pub.diff, prizeAmount: 100 },
    { gameId: phoenix.id, userId: ag.userId, guessId: ag.id, isAgent: true, difference: ag.diff, prizeAmount: 0 },
  ]);
  console.log("✔ Demo data added (players use password Player123!)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
