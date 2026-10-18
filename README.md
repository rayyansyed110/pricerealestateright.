# PriceRealEstateRight.com

Weekly "guess the sale price" game for homes under contract. Players and real estate agents guess the final sale price; when the home closes, the closest guess wins.

**Stack:** Next.js 15 (App Router, server actions) · PostgreSQL · Drizzle ORM · Tailwind CSS · Resend (email)

---

## Features

**Public site**
- Home page: hero, this week's active games with countdown, pending games, recent results, "Who's Leading?" sidebar (Public Ladder / Realtor Leaderboard, $1,000 annual prize)
- Game page with photo gallery, property data (list price, beds/baths, sq ft, last sold price & date, features, description), link to the MLS comps sister site
- Layout changes with media, matching the 4 mockup designs:
  1. No video → Agent Info card
  2. Agent promo video ("Meet the Agent & Neighborhood")
  3. Property walkthrough video
  4. Closing & negotiation video (only after the game is closed, with "Closed & Sold" ribbon)
- Guess slider plus typed amount. Other players' guesses stay hidden while guessing is open.
- **Pending phase:** histogram of everyone's guesses, median, the player's own guess marked, and "higher than X% of players"
- **Closed:** final sale price, winning guesses, top realtor, the player's own finishing position
- Leaderboards by year (points, wins, top-3 finishes, average error, accuracy streaks)
- Realtor Hub: agents apply, build a profile, and post videos (reviewed by an admin, with no price mentions allowed)
- Account page: my guesses, wins and payout status, bonus guesses, profile, password

**Accounts & security**
- Passwords hashed with bcrypt (cost 12), never stored in plain text
- Sessions in the database; only a SHA-256 hash of the session token is stored. The cookie is httpOnly, Secure and SameSite=Lax.
- Login/registration rate limiting (brute-force protection), password reset by email with 1-hour single-use tokens
- All input validated server-side (zod). Image uploads checked by type, size and file signature.
- Roles: Player, Agent (needs admin approval), Admin

**Admin panel (`/admin`)**
- Dashboard: active games, homes waiting for a sale price, agents and videos to approve, unpaid prizes
- Create and edit listings: details, photos (upload or URL), cover photo, listing agent, weekly window, prize, publish toggle
- Add, approve, hide or delete videos
- **Close a game:** enter the final sale price. Winners are picked automatically for the public and realtor ladders, and result emails go out:
  1. "Congrats, you won!"
  2. "Sorry, you overbid and overpaid for your home"
  3. "Sorry, you bid too low and lost the home of your dreams"
- Users: search, approve or reject realtors, toggle sister-site bonuses, disable accounts, make admins
- Winners & payouts: mark prizes paid; current and previous annual leaders
- Settings: guesses per game, bonus guesses, prize amounts
- Email log

## Game rules (built in)
- Weekly window: **Saturday 3:00 AM → Friday 11:59 PM** in `GAME_TIMEZONE` (new games default to this; the admin can change it)
- Status flow: Coming Soon → Open → Pending Sale (after guessing closes) → Closed & Sold (after the admin enters the sale price)
- Each player gets 1 guess per home. MLS comps site users get +1, and PriceMortgageRight.com users get +1 (configurable in Settings). A player's closest guess counts.
- Winner = closest guess, with ties going to the earliest guess. Agents compete separately.
- Ladder points: 1st = 10, 2nd = 7, 3rd = 5, 4th–5th = 3, 6th–10th = 2, plus 1 for every game played. The #1 public player for the year wins the annual prize.

---

## Run it locally

Requires Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:migrate            # creates the tables
npm run db:seed               # creates the admin account
npm run db:seed -- --demo     # (optional) demo games, agents, players and guesses
npm run dev                   # http://localhost:3000  → sign in, then go to /admin
```

Demo players use the password `Player123!` (for example `adham@example.com`). Demo agent: `sarah.agent@example.com`.
**Don't run `--demo` on the live site.**

## Deploy

### Option A: Vercel + Neon (easiest)
1. Create a free Postgres database at neon.tech (or Supabase) and copy the connection string.
2. Push this folder to GitHub, then import it on vercel.com.
3. Add every variable from `.env.example` in Vercel → Settings → Environment Variables.
4. From your computer, with `.env` pointing at the live database, run `npm run db:migrate` and `npm run db:seed`.
5. Point www.pricerealestateright.com at Vercel (Domains tab).

> ⚠️ Vercel doesn't keep uploaded files. On Vercel, add photos by **pasting image URLs** in the admin, or switch uploads to S3/Cloudflare R2 (`src/lib/uploads.ts` is the only file to change). Uploads work as-is on Option B.

### Option B: VPS / Railway / Render (uploads work out of the box)
```bash
npm ci && npm run db:migrate && npm run db:seed && npm run build
npm start      # port 3000; put Nginx/Caddy with HTTPS in front
```
Set `UPLOAD_DIR` to a persistent folder or volume (for example `/var/data/uploads`).

### Email (Resend)
1. Create an account at resend.com, add and verify the domain `pricerealestateright.com` (DNS records).
2. Create an API key and set `RESEND_API_KEY`. Set `EMAIL_FROM`, for example `PriceRealEstateRight <games@pricerealestateright.com>`.
3. Without a key, emails are only written to the Email Log in the admin panel.

### Sister-site bonuses
When someone uses the MLS comps site or PriceMortgageRight.com, that site should call:
```
POST https://www.pricerealestateright.com/api/sister-sites/verify
Authorization: Bearer <SISTER_SITE_SECRET>
Content-Type: application/json

{ "email": "player@example.com", "site": "mls" }     // or "mortgage"
```
Admins can also switch bonuses on or off by hand on the Users page.

---

## Weekly admin routine
1. **Before Saturday 3 AM:** Admin → Games → **New game** for each home (2 or more), with photos and, optionally, a listing agent and videos.
2. **During the week:** approve agent videos and new realtors.
3. **When a home's sale closes:** open the game, enter the **final sale price**, keep "Send result emails" checked, and click **Close game & pick winner**.
4. **Pay winners**, then mark them paid under Winners & Payouts. In January, pay the annual winner shown there.

## Project layout
```
src/app/            pages (public, /admin, /api)
src/app/actions/    server actions (auth, guesses, agent, admin)
src/components/     UI components
src/db/schema.ts    database tables
src/lib/            auth, game logic & scoring, email, settings, uploads
scripts/seed.ts     admin + demo data
drizzle/            SQL migrations
```

## Before launch: legal note
Cash-prize contests are regulated (sweepstakes or skill-contest rules vary by state). Have a lawyer review the official rules, eligibility (18+, US residents, void where prohibited), the "no purchase necessary" wording, and tax reporting (1099s for prizes of $600 or more a year). Also confirm that your MLS/IDX license allows the listing data and photos to be shown this way.
