-- CreateTable
CREATE TABLE "employee_locations" (
    "user_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_locations_pkey" PRIMARY KEY ("user_id","location_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_locations_location_id_key" ON "employee_locations"("location_id");

-- CreateIndex
CREATE INDEX "employee_locations_user_id_idx" ON "employee_locations"("user_id");

-- AddForeignKey
ALTER TABLE "employee_locations" ADD CONSTRAINT "employee_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_locations" ADD CONSTRAINT "employee_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("location_id") ON DELETE RESTRICT ON UPDATE CASCADE;
