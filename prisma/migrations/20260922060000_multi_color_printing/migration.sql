-- AlterTable: multi-colour print support. Primary colour stays as
-- colorName/colorHex (unchanged); this is the optional extra colours for an
-- AMS/MMU/manual-swap print, capped at 3 additional (4 total) by WishSchema.
ALTER TABLE "story" ADD COLUMN "additionalColorNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
