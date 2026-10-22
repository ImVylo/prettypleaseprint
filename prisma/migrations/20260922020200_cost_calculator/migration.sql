-- AlterTable: actual (not estimated) weight and print time, entered once known
ALTER TABLE "story" ADD COLUMN "weightGrams" INTEGER;
ALTER TABLE "story" ADD COLUMN "printMinutes" INTEGER;

-- CreateTable
CREATE TABLE "material_rate" (
    "material" "Material" NOT NULL,
    "dollarsPerKg" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_rate_pkey" PRIMARY KEY ("material")
);

-- CreateTable
CREATE TABLE "machine_rate" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dollarsPerHour" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_rate_pkey" PRIMARY KEY ("id")
);

-- Seed sane defaults so the calculator works before the owner ever visits
-- /admin/rates. These are typical consumer filament prices; the owner can
-- change every one immediately.
INSERT INTO "material_rate" ("material", "dollarsPerKg", "updatedAt") VALUES
  ('PLA', 20.0, CURRENT_TIMESTAMP),
  ('PETG', 22.0, CURRENT_TIMESTAMP),
  ('TPU', 28.0, CURRENT_TIMESTAMP),
  ('Resin', 45.0, CURRENT_TIMESTAMP);

INSERT INTO "machine_rate" ("id", "dollarsPerHour", "updatedAt") VALUES
  ('default', 0.75, CURRENT_TIMESTAMP);
