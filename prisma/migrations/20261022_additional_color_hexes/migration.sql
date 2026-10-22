-- Snapshotted hexes for the multi-colour extra colours, parallel to
-- `additionalColorNames`, so a ticket's stripe still renders after a catalogue
-- colour is renamed or retired (same snapshot rule as `colorHex`).
ALTER TABLE "story" ADD COLUMN "additionalColorHexes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
