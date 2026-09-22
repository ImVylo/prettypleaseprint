import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { record } from "@/lib/audit";
import { storyRef, type Actor } from "@/lib/scope";

/**
 * The cost calculator — homelab addition on top of the upstream app.
 *
 * The upstream app deliberately shows no print-time estimate: a number
 * derived from the bounding box is a guess dressed as a measurement (see
 * docs/architecture.md, "Why there is no print-time estimate"). Cost keeps
 * that same rule rather than breaking it — nothing here is inferred from
 * geometry. `weightGrams` and `printMinutes` are entered by the owner once
 * they are actually known (weighed filament, the slicer's own time
 * estimate, or the real elapsed time), and cost is only ever computed from
 * numbers that exist. A ticket with neither field set shows no cost, not a
 * guessed one.
 *
 * Rates are owner-managed data, exactly like `Benefit` — a $/kg per
 * material and one shared $/hour machine rate, editable at /admin/rates
 * with no code change and no redeploy.
 */

export class RateProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateProblem";
  }
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "admin") {
    throw new RateProblem("Only the printer owner manages rates.");
  }
}

function refresh() {
  revalidatePath("/admin/rates");
  revalidatePath("/admin/materials");
  revalidatePath("/queue");
  revalidatePath("/board");
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type MaterialRateRow = { material: string; dollarsPerKg: number };

export async function listMaterialRates(): Promise<MaterialRateRow[]> {
  const rows = await db.materialRate.findMany({ orderBy: { material: "asc" } });
  return rows.map((r) => ({ material: r.material, dollarsPerKg: r.dollarsPerKg }));
}

export async function machineRate(): Promise<number> {
  const row = await db.machineRate.findUnique({ where: { id: "default" } });
  return row?.dollarsPerHour ?? 0;
}

/** A lookup ready for `estimateCost` without one query per ticket. */
export async function rateTable(): Promise<{
  perKg: Record<string, number>;
  perHour: number;
}> {
  const [materials, hour] = await Promise.all([listMaterialRates(), machineRate()]);
  const perKg: Record<string, number> = {};
  for (const m of materials) perKg[m.material] = m.dollarsPerKg;
  return { perKg, perHour: hour };
}

/**
 * Materials joined with their $/kg rate, split by whether the material is
 * still active — the shape `/admin/materials` renders from, so pricing and
 * the retire toggle live in one place instead of two pages that can drift.
 *
 * A retired material's rate row is never deleted (a past ticket that used
 * it still needs a real number for `estimateCost`), but it moves out of the
 * "live" list here so the page the owner edits day to day isn't cluttered
 * with prices for things nobody can request any more.
 */
export type MaterialWithRate = {
  id: string;
  name: string;
  active: boolean;
  dollarsPerKg: number;
};

export async function listMaterialsWithRates(): Promise<{
  live: MaterialWithRate[];
  retired: MaterialWithRate[];
}> {
  const [materials, rates] = await Promise.all([
    db.material.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.materialRate.findMany(),
  ]);
  const rateByName = new Map(rates.map((r) => [r.material, r.dollarsPerKg]));

  const rows: MaterialWithRate[] = materials.map((m) => ({
    id: m.id,
    name: m.name,
    active: m.active,
    // A material somehow missing a rate row (shouldn't happen — createMaterial
    // always seeds one) reads as $0 rather than throwing, consistent with
    // estimateCost's own fallback.
    dollarsPerKg: rateByName.get(m.name) ?? 0,
  }));

  return {
    live: rows.filter((r) => r.active),
    retired: rows.filter((r) => !r.active),
  };
}

// ---------------------------------------------------------------------------
// The calculation itself — pure, so it is trivially testable and cannot
// reach the database on its own.
// ---------------------------------------------------------------------------

export type CostEstimate = {
  materialCost: number;
  machineCost: number;
  total: number;
};

/**
 * Cost from what was actually measured — never from a guess. Returns null,
 * not a zero, when there is nothing to compute from: a ticket with no
 * `weightGrams` and no `printMinutes` has no cost figure, the same way it
 * has no print-time figure, until someone enters one.
 */
export function estimateCost(
  material: string,
  weightGrams: number | null | undefined,
  printMinutes: number | null | undefined,
  rates: { perKg: Record<string, number>; perHour: number },
): CostEstimate | null {
  if (!weightGrams && !printMinutes) return null;

  const perKg = rates.perKg[material] ?? 0;
  const materialCost = weightGrams ? (weightGrams / 1000) * perKg : 0;
  const machineCost = printMinutes ? (printMinutes / 60) * rates.perHour : 0;

  return {
    materialCost: round2(materialCost),
    machineCost: round2(machineCost),
    total: round2(materialCost + machineCost),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const formatDollars = (n: number) =>
  `$${n.toFixed(2)}`;

// ---------------------------------------------------------------------------
// Mutations (owner-only)
// ---------------------------------------------------------------------------

const DollarsSchema = z.coerce.number().finite().min(0).max(100000);
const GramsSchema = z.coerce.number().int().min(0).max(250_000); // matches MAX_UPLOAD_BYTES's spirit — a sane ceiling, not a real limit
const MinutesSchema = z.coerce.number().int().min(0).max(100_000);

export async function setMaterialRate(
  actor: Actor,
  material: string,
  rawDollarsPerKg: unknown,
): Promise<MaterialRateRow> {
  assertAdmin(actor);

  const parsed = DollarsSchema.safeParse(rawDollarsPerKg);
  if (!parsed.success) throw new RateProblem("Enter a price of $0 or more.");

  const updated = await db.materialRate.upsert({
    where: { material },
    update: { dollarsPerKg: parsed.data },
    create: { material, dollarsPerKg: parsed.data },
  });

  await record({
    action: "rate.material_updated",
    actor,
    subject: material,
    detail: { dollarsPerKg: parsed.data },
  });
  refresh();
  return { material: updated.material, dollarsPerKg: updated.dollarsPerKg };
}

export async function setMachineRate(actor: Actor, rawDollarsPerHour: unknown): Promise<number> {
  assertAdmin(actor);

  const parsed = DollarsSchema.safeParse(rawDollarsPerHour);
  if (!parsed.success) throw new RateProblem("Enter a rate of $0 or more.");

  const updated = await db.machineRate.upsert({
    where: { id: "default" },
    update: { dollarsPerHour: parsed.data },
    create: { id: "default", dollarsPerHour: parsed.data },
  });

  await record({
    action: "rate.machine_updated",
    actor,
    subject: "machine",
    detail: { dollarsPerHour: parsed.data },
  });
  refresh();
  return updated.dollarsPerHour;
}

/**
 * The owner records what a print actually used, once known. Either field
 * may be set alone — a quick weigh-in before the print time is known is a
 * common order to learn things in.
 */
export async function recordActuals(
  actor: Actor,
  storyId: number,
  raw: { weightGrams?: unknown; printMinutes?: unknown },
): Promise<{ weightGrams: number | null; printMinutes: number | null }> {
  assertAdmin(actor);

  const story = await db.story.findUnique({ where: { id: storyId }, select: { id: true } });
  if (!story) throw new RateProblem("That ticket no longer exists.");

  const data: { weightGrams?: number | null; printMinutes?: number | null } = {};

  if (raw.weightGrams !== undefined) {
    if (raw.weightGrams === "" || raw.weightGrams === null) {
      data.weightGrams = null;
    } else {
      const parsed = GramsSchema.safeParse(raw.weightGrams);
      if (!parsed.success) throw new RateProblem("Weight must be a whole number of grams.");
      data.weightGrams = parsed.data;
    }
  }

  if (raw.printMinutes !== undefined) {
    if (raw.printMinutes === "" || raw.printMinutes === null) {
      data.printMinutes = null;
    } else {
      const parsed = MinutesSchema.safeParse(raw.printMinutes);
      if (!parsed.success) throw new RateProblem("Print time must be a whole number of minutes.");
      data.printMinutes = parsed.data;
    }
  }

  const updated = await db.story.update({ where: { id: storyId }, data });

  await record({
    action: "story.actuals_recorded",
    actor,
    subject: storyRef(storyId),
    detail: { weightGrams: updated.weightGrams, printMinutes: updated.printMinutes },
  });

  revalidatePath(`/story/${storyId}`);
  revalidatePath("/queue");
  revalidatePath("/history");

  return { weightGrams: updated.weightGrams, printMinutes: updated.printMinutes };
}
