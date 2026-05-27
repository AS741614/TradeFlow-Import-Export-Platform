CREATE TABLE "app_metadata" (
	"org_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_metadata_pkey" PRIMARY KEY("org_id","key")
);
--> statement-breakpoint
ALTER TABLE "app_metadata" ADD CONSTRAINT "app_metadata_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;