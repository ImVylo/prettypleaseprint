-- A print can pause at "Quoted" while the requester approves the owner's
-- price. Quoted is a side-state like Declined, not a step in the main flow,
-- so the rail (Requested → Accepted → … → Done) still advances the same way.
ALTER TYPE "StoryStatus" ADD VALUE 'Quoted';

-- The frozen total at quote time, so editing a rate later doesn't move an
-- already-sent quote.
ALTER TABLE "story" ADD COLUMN "quotedTotal" DOUBLE PRECISION;
