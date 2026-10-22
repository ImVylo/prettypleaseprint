-- Optional per-colour $/kg: a specific colour or spool can cost more than the
-- material's default (specialty, glow-in-the-dark, etc.). NULL means "inherit
-- the material rate", so nothing changes for colours without a price.
ALTER TABLE "catalogColor" ADD COLUMN "dollarsPerKg" DOUBLE PRECISION;
