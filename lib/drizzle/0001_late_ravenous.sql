CREATE TABLE IF NOT EXISTS "Template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
