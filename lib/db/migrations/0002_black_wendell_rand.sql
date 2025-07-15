CREATE TABLE "TemporaryDocument" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "TemporaryDocument_id_createdAt_pk" PRIMARY KEY("id","createdAt")
);
