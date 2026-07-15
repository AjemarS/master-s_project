ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "marketing_consent" boolean;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locale" text;
