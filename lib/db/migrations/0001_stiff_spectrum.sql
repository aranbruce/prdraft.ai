ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredTemplateId" uuid;
CREATE INDEX IF NOT EXISTS "idx_user_preferredTemplateId" ON "User" ("preferredTemplateId");