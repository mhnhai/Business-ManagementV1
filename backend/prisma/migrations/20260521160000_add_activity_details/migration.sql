-- CreateTable
CREATE TABLE "activity_details" (
    "activity_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sale_price" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "activity_details_pkey" PRIMARY KEY ("activity_id","product_id")
);

-- AddForeignKey
ALTER TABLE "activity_details" ADD CONSTRAINT "activity_details_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_details" ADD CONSTRAINT "activity_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;
