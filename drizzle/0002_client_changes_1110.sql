ALTER TABLE "agent_profiles" ADD COLUMN "category" text DEFAULT 'AGENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "company_city" text;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD COLUMN "brokerage_leaderboard" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "buyer_agent_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "household_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_game_alerts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_win_notify" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rules_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_buyer_agent_id_agent_profiles_id_fk" FOREIGN KEY ("buyer_agent_id") REFERENCES "public"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_household_idx" ON "users" USING btree ("household_key");