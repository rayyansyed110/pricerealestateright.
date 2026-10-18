CREATE TYPE "public"."agent_status" AS ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('PLAYER', 'AGENT', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."video_type" AS ENUM('AGENT_PROMO', 'WALKTHROUGH', 'CLOSING');--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"brokerage" text NOT NULL,
	"license_number" text,
	"license_state" text,
	"phone" text,
	"email" text,
	"website" text,
	"photo_url" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"type" text NOT NULL,
	"game_id" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_winners" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"guess_id" text NOT NULL,
	"is_agent" boolean NOT NULL,
	"difference" integer NOT NULL,
	"prize_amount" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text,
	"list_price" integer NOT NULL,
	"beds" double precision NOT NULL,
	"baths" double precision NOT NULL,
	"sqft" integer NOT NULL,
	"lot_size" text,
	"year_built" integer,
	"property_type" text,
	"last_sold_price" integer,
	"last_sold_date" timestamp with time zone,
	"features" text,
	"description" text,
	"mls_number" text,
	"mls_url" text,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"final_sale_price" integer,
	"sale_closed_at" timestamp with time zone,
	"results_sent_at" timestamp with time zone,
	"prize_amount" integer DEFAULT 100 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"listing_agent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "guesses" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"is_agent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"city" text,
	"role" "role" DEFAULT 'PLAYER' NOT NULL,
	"agent_status" "agent_status" DEFAULT 'NONE' NOT NULL,
	"used_mls_comps" boolean DEFAULT false NOT NULL,
	"used_mortgage_site" boolean DEFAULT false NOT NULL,
	"marketing_opt_in" boolean DEFAULT true NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"agent_id" text,
	"type" "video_type" NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_winners" ADD CONSTRAINT "game_winners_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_winners" ADD CONSTRAINT "game_winners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_listing_agent_id_agent_profiles_id_fk" FOREIGN KEY ("listing_agent_id") REFERENCES "public"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_agent_id_agent_profiles_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_winners_game_cat" ON "game_winners" USING btree ("game_id","is_agent");--> statement-breakpoint
CREATE INDEX "games_window_idx" ON "games" USING btree ("opens_at","closes_at");--> statement-breakpoint
CREATE INDEX "guesses_game_idx" ON "guesses" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "guesses_user_idx" ON "guesses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_attempts_key_idx" ON "login_attempts" USING btree ("key","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");