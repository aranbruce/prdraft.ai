CREATE TABLE IF NOT EXISTS "Chat" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(64) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"messages" json NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(64) NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" varchar(64),
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
