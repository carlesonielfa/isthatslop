CREATE TABLE "source_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"ancestor_id" uuid NOT NULL,
	"path" text NOT NULL,
	"path_type" text DEFAULT 'primary' NOT NULL,
	"depth" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_paths" ADD CONSTRAINT "source_paths_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_paths" ADD CONSTRAINT "source_paths_ancestor_id_sources_id_fk" FOREIGN KEY ("ancestor_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_paths_source_idx" ON "source_paths" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_paths_ancestor_idx" ON "source_paths" USING btree ("ancestor_id");--> statement-breakpoint
CREATE INDEX "source_paths_path_idx" ON "source_paths" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "source_paths_source_path_uniq" ON "source_paths" USING btree ("source_id","path");