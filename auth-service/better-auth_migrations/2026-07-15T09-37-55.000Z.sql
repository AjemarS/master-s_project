ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isAnonymous" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_name" text;
