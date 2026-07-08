-- Nha cung cap, phieu nhap hang, chi tiet nhap hang

CREATE TABLE "suppliers" (
    "supplier_id" SERIAL NOT NULL,
    "supplier_name" VARCHAR(50) NOT NULL,
    "business_type" VARCHAR(50) NOT NULL,
    "address" VARCHAR(50) NOT NULL,
    "phone_number" VARCHAR(10) NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

CREATE TABLE "imports" (
    "import_id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "import_date" TIMESTAMP(3) NOT NULL,
    "content" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("import_id")
);

CREATE TABLE "import_details" (
    "import_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "import_price" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "import_details_pkey" PRIMARY KEY ("import_id","product_id")
);

CREATE INDEX "imports_supplier_id_idx" ON "imports"("supplier_id");
CREATE INDEX "import_details_import_id_idx" ON "import_details"("import_id");

ALTER TABLE "imports" ADD CONSTRAINT "imports_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_details" ADD CONSTRAINT "import_details_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("import_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_details" ADD CONSTRAINT "import_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;
