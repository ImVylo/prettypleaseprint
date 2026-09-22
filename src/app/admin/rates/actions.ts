"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authz";
import { RateProblem, recordActuals, setMachineRate, setMaterialRate } from "@/lib/cost";

/**
 * The owner's controls for cost rates and per-ticket actuals, as plain
 * server-action forms — same shape as src/app/admin/benefits/actions.ts.
 * The rules and the audit trail live in src/lib/cost.ts; this file reads a
 * FormData, calls the operation, and redirects with a toast.
 */

function back(params: Record<string, string>): never {
  redirect(`/admin/rates?${new URLSearchParams(params).toString()}`);
}

export async function setMaterialRateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const material = String(formData.get("material") ?? "");
  try {
    const r = await setMaterialRate(admin, material, formData.get("dollarsPerKg"));
    back({ toast: `${r.material} set to $${r.dollarsPerKg.toFixed(2)}/kg` });
  } catch (error) {
    if (error instanceof RateProblem) back({ error: error.message });
    throw error;
  }
}

export async function setMachineRateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    const dollarsPerHour = await setMachineRate(admin, formData.get("dollarsPerHour"));
    back({ toast: `Machine rate set to $${dollarsPerHour.toFixed(2)}/hour` });
  } catch (error) {
    if (error instanceof RateProblem) back({ error: error.message });
    throw error;
  }
}

/**
 * Record what a print actually used. Lands back on the ticket, not the
 * rates page — this is filled in from a story's own panel.
 */
export async function recordActualsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const storyId = Number(formData.get("storyId"));
  const from = String(formData.get("from") ?? `/story/${storyId}`);
  try {
    await recordActuals(admin, storyId, {
      weightGrams: formData.get("weightGrams"),
      printMinutes: formData.get("printMinutes"),
    });
    redirect(`${from}?${new URLSearchParams({ toast: "Actuals saved" }).toString()}`);
  } catch (error) {
    if (error instanceof RateProblem) {
      redirect(`${from}?${new URLSearchParams({ error: error.message }).toString()}`);
    }
    throw error;
  }
}
