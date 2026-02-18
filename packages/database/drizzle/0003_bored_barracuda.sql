CREATE TABLE "comment_votes" (
	"comment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_claim_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."claim_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_votes_comment_idx" ON "comment_votes" USING btree ("comment_id");