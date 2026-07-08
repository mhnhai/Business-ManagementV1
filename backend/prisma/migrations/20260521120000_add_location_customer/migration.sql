-- CreateTable
CREATE TABLE "locations" (
    "location_id" SERIAL NOT NULL,
    "province" VARCHAR(50) NOT NULL,
    "ward" VARCHAR(50) NOT NULL,
    "ward_code" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "company_name" VARCHAR(50) NOT NULL,
    "business_type" VARCHAR(50) NOT NULL,
    "representative_name" VARCHAR(50) NOT NULL,
    "position" VARCHAR(50) NOT NULL,
    "phone_number" VARCHAR(10) NOT NULL,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_ward_code_key" ON "locations"("ward_code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_province_ward_key" ON "locations"("province", "ward");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;
