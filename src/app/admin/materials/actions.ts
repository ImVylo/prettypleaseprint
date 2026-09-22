"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authz";
import { MaterialProblem, createMaterial, updateMaterial } from "@/lib/materials";
import { RateProblem, setMaterialRate } from "@/lib/cost";

/**
 * The owner's controls for the materials catalogue, as plain server-action
 * forms — same shape as src/app/admin/benefits/actions.ts. The rules and the
 * audit trail live in src/lib/materials.ts; this file reads a FormData,
 * calls the operation and redirects with a toast.
 */

function back(params: Record<string, string>): never {
  redirect(`/admin/materials?${new URLSearchParams(params).toString()}`);
}

export async function createMaterialAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    const m = await createMaterial(admin, formData.get("name") ?? "");
    back({ toast: `Added “${m.name}”` });
  } catch (error) {
    if (error instanceof MaterialProblem) back({ error: error.message });
    throw error;
  }
}

export async function renameMaterialAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    const m = await updateMaterial(admin, id, { name: formData.get("name") ?? "" });
    back({ toast: `Renamed to “${m.name}”` });
  } catch (error) {
    if (error instanceof MaterialProblem) back({ error: error.message });
    throw error;
  }
}

export async function setMaterialActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  try {
    const m = await updateMaterial(admin, id, { active });
    back({ toast: active ? `“${m.name}” back on the list` : `“${m.name}” retired` });
  } catch (error) {
    if (error instanceof MaterialProblem) back({ error: error.message });
    throw error;
  }
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
