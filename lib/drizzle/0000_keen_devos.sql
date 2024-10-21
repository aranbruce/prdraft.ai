CREATE TABLE
IF NOT EXISTS "Chat"
(
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid
() NOT NULL,
    "title" varchar
(64) NOT NULL,
    "createdAt" timestamp NOT NULL,
    "messages" json NOT NULL,
    "userId" uuid NOT NULL
);

CREATE TABLE
IF NOT EXISTS "User"
(
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid
() NOT NULL,
    "email" varchar
(64) NOT NULL,
    "password" varchar
(64) NOT NULL
);

DO $$ 
BEGIN
	ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
	EXCEPTION
        WHEN duplicate_object THEN NULL;
END $$;