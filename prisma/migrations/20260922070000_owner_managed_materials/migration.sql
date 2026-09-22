-- Materials become owner-managed data instead of a fixed enum.
--
-- 1. New `material` table, mirroring `benefit`'s shape.
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_name_key" ON "material"("name");
CREATE INDEX "material_active_sortOrder_idx" ON "material"("active", "sortOrder");

-- Seed the four materials the app always shipped with, so existing
-- deployments see no change in the upload form until the owner edits it.
INSERT INTO "material" ("id", "name", "sortOrder", "updatedAt") VALUES
  ('mat_pla',   'PLA',   1, CURRENT_TIMESTAMP),
  ('mat_petg',  'PETG',  2, CURRENT_TIMESTAMP),
  ('mat_tpu',   'TPU',   3, CURRENT_TIMESTAMP),
  ('mat_resin', 'Resin', 4, CURRENT_TIMESTAMP);

-- 2. `story.material` moves from the `Material` enum to a plain TEXT column,
-- keeping every existing value (enum values ARE their own string form in
-- Postgres, so USING casts losslessly with no data loss).
ALTER TABLE "story" ALTER COLUMN "material" DROP DEFAULT;
ALTER TABLE "story" ALTER COLUMN "material" TYPE TEXT USING "material"::TEXT;
ALTER TABLE "story" ALTER COLUMN "material" SET DEFAULT 'PETG';

-- 3. `material_rate.material` (the cost calculator's $/kg table) moves the
-- same way — a plain string, not a foreign key, so a rate for a
-- since-retired or since-renamed material keeps working.
ALTER TABLE "material_rate" ALTER COLUMN "material" TYPE TEXT USING "material"::TEXT;

-- 4. The enum type itself is no longer referenced by any column; drop it.
DROP TYPE "Material";
