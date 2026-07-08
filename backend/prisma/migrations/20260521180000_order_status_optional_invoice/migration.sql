-- CreateTable
CREATE TABLE "order_statuses" (
    "status_code" VARCHAR(50) NOT NULL,
    "status_name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "order_statuses_pkey" PRIMARY KEY ("status_code")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_statuses_sort_order_key" ON "order_statuses"("sort_order");

-- Seed order statuses
INSERT INTO "order_statuses" ("status_code", "status_name", "sort_order", "is_terminal") VALUES
('draft', 'Nháp', 1, false),
('confirmed', 'Đã xác nhận', 2, false),
('processing', 'Đang xử lý', 3, false),
('completed', 'Hoàn thành', 4, true);

-- AlterTable: invoice optional on activity
ALTER TABLE "activities" ALTER COLUMN "invoice_id" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_invoice_id_fkey";

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE SET NULL ON UPDATE CASCADE;
