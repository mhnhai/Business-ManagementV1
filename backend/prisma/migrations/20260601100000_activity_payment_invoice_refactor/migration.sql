-- ERD: payment_status on activities; invoice without status; payments table

CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'partial', 'paid');

ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid';

ALTER TABLE "invoices" DROP COLUMN IF EXISTS "status";

DROP TYPE IF EXISTS "InvoiceStatus";

CREATE TABLE IF NOT EXISTS "payments" (
    "payment_id" SERIAL NOT NULL,
    "activity_id" INTEGER NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

CREATE INDEX IF NOT EXISTS "payments_activity_id_idx" ON "payments"("activity_id");

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_activity_id_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_activity_id_fkey"
  FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
