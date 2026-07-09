-- Allow nullable content for activity and import documents
ALTER TABLE "activities"
  ALTER COLUMN "content" DROP NOT NULL;

ALTER TABLE "imports"
  ALTER COLUMN "content" DROP NOT NULL;
