-- Merge employee profile into users; activities reference user_id

ALTER TABLE "users" ADD COLUMN "fullname" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "department" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "phone_number" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "email" VARCHAR(50);

UPDATE "users" u
SET
  "fullname" = e."employee_name",
  "department" = e."department",
  "phone_number" = e."phone_number",
  "email" = e."email"
FROM "employees" e
WHERE e."user_id" = u."user_id";

UPDATE "users"
SET
  "fullname" = COALESCE("fullname", "username"),
  "department" = COALESCE("department", ''),
  "phone_number" = COALESCE("phone_number", ''),
  "email" = COALESCE("email", '')
WHERE "fullname" IS NULL;

ALTER TABLE "users" ALTER COLUMN "fullname" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "department" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phone_number" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "activities" ADD COLUMN "user_id" INTEGER;

UPDATE "activities" a
SET "user_id" = e."user_id"
FROM "employees" e
WHERE a."employee_id" = e."employee_id";

ALTER TABLE "activities" DROP CONSTRAINT "activities_employee_id_fkey";
ALTER TABLE "activities" DROP COLUMN "employee_id";

ALTER TABLE "activities" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "employees";
