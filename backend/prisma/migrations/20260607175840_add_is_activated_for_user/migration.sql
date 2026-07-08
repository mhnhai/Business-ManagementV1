/*
  Warnings:

  - Added the required column `is_activated` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_activated" BOOLEAN NOT NULL;

-- CreateIndex
CREATE INDEX "activities_user_id_idx" ON "activities"("user_id");

-- CreateIndex
CREATE INDEX "activities_customer_id_idx" ON "activities"("customer_id");

-- CreateIndex
CREATE INDEX "activity_details_activity_id_idx" ON "activity_details"("activity_id");
