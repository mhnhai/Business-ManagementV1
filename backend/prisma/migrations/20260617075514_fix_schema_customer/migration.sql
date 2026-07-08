/*
  Warnings:

  - You are about to drop the column `house_number` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `subdistrict` on the `customers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "house_number",
DROP COLUMN "street",
DROP COLUMN "subdistrict";
