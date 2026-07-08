-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "house_number" VARCHAR(20),
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "street" VARCHAR(150),
ADD COLUMN     "subdistrict" VARCHAR(150);

-- CreateIndex
CREATE INDEX "customers_lat_lng_idx" ON "customers"("lat", "lng");
