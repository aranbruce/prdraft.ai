ALTER TABLE "TemporaryDocument" DROP CONSTRAINT "TemporaryDocument_id_createdAt_pk";--> statement-breakpoint
ALTER TABLE "TemporaryDocument" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "TemporaryDocument" ALTER COLUMN "id" DROP DEFAULT;