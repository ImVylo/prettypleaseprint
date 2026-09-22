import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { record } from "@/lib/audit";
import type { Actor } from "@/lib/scope";

/**
 * The materials catalogue — owner-managed, mirroring `benefits.ts` exactly.
 *
 * `Story.material` used to be a fixed Prisma enum (PLA/PETG/TPU/Resin). That
 * meant adding a material was a migration and a redeploy — the same
 * limitation the tip catalogue had before it became owner-managed data. This
 * is that same fix applied to materials: a plain string column plus a table
 * the owner edits at /admin/materials, seeded with the original four so an
 * existing deployment sees no change until the owner touches it.
 *
 * Reads are open (any signed-in page renders the list); mutations are
 * owner-only and re-check the role here as well as at the action, because
 * rendering a page is not authorisation. Every change is audited.
 */

export class MaterialProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterialProblem";
  }
}

const NameSchema = z
  .string()
  .trim()
  .min(1, "Give the material a name.")
  .max(40, "Keep it short — under 40 characters.");

function assertAdmin(actor: Actor) {
  if (actor.role !== "admin") {
    throw new MaterialProblem("Only the printer owner manages materials.");
  }
}

function refresh() {
  revalidatePath("/admin/materials");
  revalidatePath("/admin/rates");
  revalidatePath("/upload");
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const ORDER = [{ sortOrder: "asc" as const }, { name: "asc" as const }];

export type MaterialRow = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

const SELECT = { id: true, name: true, active: true, sortOrder: true } as const;

/** The choices the upload form offers, ordered. */
export function listActiveMaterials(): Promise<MaterialRow[]> {
  return db.material.findMany({ where: { active: true }, select: SELECT, orderBy: ORDER });
}

/** Everything, for the admin screen and for the cost-rates page. */
export function listAllMaterials(): Promise<MaterialRow[]> {
  return db.material.findMany({ select: SELECT, orderBy: ORDER });
}

/** The names an upload's material is allowed to be. Authoritative server-side. */
export async function activeMaterialNames(): Promise<string[]> {
  const rows = await db.material.findMany({ where: { active: true }, select: { name: true } });
  return rows.map((r) => r.name);
}

// ---------------------------------------------------------------------------
// Mutations (owner-only)
// ---------------------------------------------------------------------------

export async function createMaterial(actor: Actor, rawName: unknown): Promise<MaterialRow> {
  assertAdmin(actor);

  const parsed = NameSchema.safeParse(typeof rawName === "string" ? rawName : "");
  if (!parsed.success) throw new MaterialProblem(parsed.error.issues[0]?.message ?? "Check the name.");
  const name = parsed.data;

  const last = await db.material.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });

  let created: MaterialRow;
  try {
    created = await db.material.create({
      data: { name, sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: SELECT,
    });
  } catch {
    throw new MaterialProblem(`“${name}” is already on the list.`);
  }

  // A brand-new material has no cost-calculator rate yet. Seed one at $0/kg
  // rather than leaving it absent — absent reads as "unpriced" (0) either
  // way in estimateCost, but an explicit row means it shows up to edit at
  // /admin/rates immediately instead of only after the first ticket uses it.
  await db.materialRate.upsert({
    where: { material: name },
    update: {},
    create: { material: name, dollarsPerKg: 0 },
  });

  await record({ action: "material.created", actor, subject: name });
  refresh();
  return created;
}

export async function updateMaterial(
  actor: Actor,
  id: string,
  patch: { name?: unknown; active?: boolean },
): Promise<MaterialRow> {
  assertAdmin(actor);

  const existing = await db.material.findUnique({ where: { id }, select: SELECT });
  if (!existing) throw new MaterialProblem("That material no longer exists.");

  const data: { name?: string; active?: boolean } = {};
  const detail: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    const parsed = NameSchema.safeParse(typeof patch.name === "string" ? patch.name : "");
    if (!parsed.success) throw new MaterialProblem(parsed.error.issues[0]?.message ?? "Check the name.");
    if (parsed.data !== existing.name) {
      data.name = parsed.data;
      detail.name = { from: existing.name, to: parsed.data };
    }
  }
  if (patch.active !== undefined && patch.active !== existing.active) {
    data.active = patch.active;
    detail.active = patch.active;
  }

  if (Object.keys(data).length === 0) return existing;

  let updated: MaterialRow;
  try {
    updated = await db.material.update({ where: { id }, data, select: SELECT });
  } catch {
    throw new MaterialProblem(`“${data.name}” is already on the list.`);
  }

  // Renaming carries the cost rate across so a price is never silently lost;
  // the old rate row is removed rather than left orphaned under a name
  // nothing offers any more.
  if (data.name) {
    const oldRate = await db.materialRate.findUnique({ where: { material: existing.name } });
    if (oldRate) {
      await db.materialRate.upsert({
        where: { material: data.name },
        update: { dollarsPerKg: oldRate.dollarsPerKg },
        create: { material: data.name, dollarsPerKg: oldRate.dollarsPerKg },
      });
      await db.materialRate.delete({ where: { material: existing.name } });
    }
  }

  await record({ action: "material.updated", actor, subject: updated.name, detail });
  refresh();
  return updated;
}
