-- Reference-only "source URL" field: where a model came from (MakerWorld,
-- Printables, Thingiverse, Thangs…), for the owner to open themselves.
-- No fetching happens against it — see the column comment in schema.prisma.
ALTER TABLE "story" ADD COLUMN "sourceUrl" TEXT;
