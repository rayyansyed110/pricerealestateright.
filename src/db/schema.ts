import { relations } from "drizzle-orm";
import {
  customType,
  boolean, doublePrecision, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["PLAYER", "AGENT", "ADMIN"]);
export const agentStatusEnum = pgEnum("agent_status", ["NONE", "PENDING", "APPROVED", "REJECTED"]);
// AGENT_PROMO = "Meet the Agent & Neighborhood", WALKTHROUGH = "Property Walkthrough & Features Tour",
// CLOSING = "Closing & Negotiation" (shown once the game is finished)
export const videoTypeEnum = pgEnum("video_type", ["AGENT_PROMO", "WALKTHROUGH", "CLOSING"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  city: text("city"),
  role: roleEnum("role").notNull().default("PLAYER"),
  agentStatus: agentStatusEnum("agent_status").notNull().default("NONE"),
  usedMlsComps: boolean("used_mls_comps").notNull().default(false),
  usedMortgageSite: boolean("used_mortgage_site").notNull().default(false),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(true),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: createdAt(),
});

export const agentProfiles = pgTable("agent_profiles", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: text("display_name").notNull(),
  brokerage: text("brokerage").notNull(),
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  photoUrl: text("photo_url"),
  bio: text("bio"),
  createdAt: createdAt(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: id(),
  key: text("key").notNull(),
  success: boolean("success").notNull(),
  createdAt: createdAt(),
}, (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)]);

export const games = pgTable("games", {
  id: id(),
  slug: text("slug").notNull().unique(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip"),
  listPrice: integer("list_price").notNull(),
  beds: doublePrecision("beds").notNull(),
  baths: doublePrecision("baths").notNull(),
  sqft: integer("sqft").notNull(),
  lotSize: text("lot_size"),
  yearBuilt: integer("year_built"),
  propertyType: text("property_type"),
  lastSoldPrice: integer("last_sold_price"),
  lastSoldDate: timestamp("last_sold_date", { withTimezone: true }),
  features: text("features"),
  description: text("description"),
  mlsNumber: text("mls_number"),
  mlsUrl: text("mls_url"),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  finalSalePrice: integer("final_sale_price"),
  saleClosedAt: timestamp("sale_closed_at", { withTimezone: true }),
  resultsSentAt: timestamp("results_sent_at", { withTimezone: true }),
  prizeAmount: integer("prize_amount").notNull().default(100),
  published: boolean("published").notNull().default(true),
  listingAgentId: text("listing_agent_id").references(() => agentProfiles.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [index("games_window_idx").on(t.opensAt, t.closesAt)]);

export const photos = pgTable("photos", {
  id: id(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const videos = pgTable("videos", {
  id: id(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  agentId: text("agent_id").references(() => agentProfiles.id, { onDelete: "set null" }),
  type: videoTypeEnum("type").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  approved: boolean("approved").notNull().default(false),
  createdAt: createdAt(),
});

export const guesses = pgTable("guesses", {
  id: id(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  isAgent: boolean("is_agent").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("guesses_game_idx").on(t.gameId), index("guesses_user_idx").on(t.userId)]);

export const gameWinners = pgTable("game_winners", {
  id: id(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guessId: text("guess_id").notNull(),
  isAgent: boolean("is_agent").notNull(),
  difference: integer("difference").notNull(),
  prizeAmount: integer("prize_amount").notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("game_winners_game_cat").on(t.gameId, t.isAgent)]);

export const emailLogs = pgTable("email_logs", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  type: text("type").notNull(),
  gameId: text("game_id").references(() => games.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: createdAt(),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** Uploaded images stored in the database (used on hosts without persistent disk, e.g. Vercel, when Vercel Blob isn't set up). */
export const files = pgTable("files", {
  id: id(),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ---- relations ----
export const usersRelations = relations(users, ({ one, many }) => ({
  agentProfile: one(agentProfiles, { fields: [users.id], references: [agentProfiles.userId] }),
  guesses: many(guesses),
}));
export const agentProfilesRelations = relations(agentProfiles, ({ one, many }) => ({
  user: one(users, { fields: [agentProfiles.userId], references: [users.id] }),
  listings: many(games),
  videos: many(videos),
}));
export const gamesRelations = relations(games, ({ one, many }) => ({
  listingAgent: one(agentProfiles, { fields: [games.listingAgentId], references: [agentProfiles.id] }),
  photos: many(photos),
  videos: many(videos),
  guesses: many(guesses),
  winners: many(gameWinners),
}));
export const photosRelations = relations(photos, ({ one }) => ({
  game: one(games, { fields: [photos.gameId], references: [games.id] }),
}));
export const videosRelations = relations(videos, ({ one }) => ({
  game: one(games, { fields: [videos.gameId], references: [games.id] }),
  agent: one(agentProfiles, { fields: [videos.agentId], references: [agentProfiles.id] }),
}));
export const guessesRelations = relations(guesses, ({ one }) => ({
  game: one(games, { fields: [guesses.gameId], references: [games.id] }),
  user: one(users, { fields: [guesses.userId], references: [users.id] }),
}));
export const gameWinnersRelations = relations(gameWinners, ({ one }) => ({
  game: one(games, { fields: [gameWinners.gameId], references: [games.id] }),
  user: one(users, { fields: [gameWinners.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type AgentProfile = typeof agentProfiles.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Photo = typeof photos.$inferSelect;
