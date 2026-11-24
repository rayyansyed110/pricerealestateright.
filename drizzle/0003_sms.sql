ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "announced_at" timestamp with time zone;--> statement-breakpoint
UPDATE "games" SET "announced_at" = now() WHERE "opens_at" <= now();
