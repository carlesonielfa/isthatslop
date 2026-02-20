ALTER TABLE "sources" ADD COLUMN "approval_status" text DEFAULT 'approved' NOT NULL;
ALTER TABLE "sources" ALTER COLUMN "approval_status" SET DEFAULT 'pending';
