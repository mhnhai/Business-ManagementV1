-- Allow optional customer contact/person fields
ALTER TABLE "customers"
  ALTER COLUMN "position" DROP NOT NULL,
  ALTER COLUMN "phone_number" DROP NOT NULL;
