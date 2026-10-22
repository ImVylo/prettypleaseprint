-- Carry any owner-added materials from the fork's old `material` table into
-- the new catalogue. `dynamic_material_catalog` seeds the standard four (with
-- colours); this moves only ones the owner added afterwards, so nothing they
-- could previously request silently drops off the upload form.
--
-- Guarded on the table's existence: a fresh database (which never ran the
-- fork's `owner_managed_materials` migration) has no `material` table, and
-- this must be a no-op there. Idempotent on re-run via ON CONFLICT.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material') THEN
    INSERT INTO "catalogMaterial" ("id", "name", "active", "sortOrder", "createdAt", "updatedAt")
    SELECT 'catalog-' || m."id", m."name", m."active", m."sortOrder", m."createdAt", m."updatedAt"
    FROM "material" m
    ON CONFLICT ("name") DO NOTHING;

    -- A material with no colours is not offered on the upload form, so give
    -- each colourless one a single neutral swatch; the owner adds the rest at
    -- /admin/catalog.
    INSERT INTO "catalogColor" ("id", "materialId", "name", "hex", "style", "mode", "sortOrder")
    SELECT 'catalog-color-' || cm."id" || '-slate', cm."id", 'Slate', '#4a5d78', '#4a5d78', 'solid', 0
    FROM "catalogMaterial" cm
    WHERE NOT EXISTS (SELECT 1 FROM "catalogColor" cc WHERE cc."materialId" = cm."id")
    ON CONFLICT ("materialId", "name") DO NOTHING;
  END IF;
END
$$;
