-- Rename audit columns to snake_case (non-user tables only)

ALTER TABLE "products" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "products" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "locations" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "locations" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "customers" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "customers" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "invoices" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "invoices" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "activities" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "activities" RENAME COLUMN "updatedAt" TO "updated_at";
