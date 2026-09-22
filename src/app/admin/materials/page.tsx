import { requireAdmin } from "@/lib/authz";
import { listAllMaterials } from "@/lib/materials";
import { AppHeader } from "@/components/app-header";
import { Kicker, Notice } from "@/components/ui";
import { Toast } from "@/components/toast";
import {
  createMaterialAction,
  renameMaterialAction,
  setMaterialActiveAction,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * Manage the materials catalogue — what a request can be made from.
 * Admin-only, same shape as /admin/benefits: `requireAdmin` answers 404, so
 * a client learns nothing about this route.
 *
 * Materials used to be a fixed enum (PLA/PETG/TPU/Resin), which meant adding
 * one was a migration and a redeploy. Now it is owner-managed data, exactly
 * like the tip catalogue — retire one to take it off the upload form without
 * touching past requests that used it, or add a new one (Nylon, ABS, PC…)
 * with nothing more than this form. A cost-calculator rate is created
 * automatically at $0/kg — set the real price at /admin/rates.
 */
export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string; error?: string }>;
}) {
  const [{ toast, error }, admin] = await Promise.all([searchParams, requireAdmin()]);
  const materials = await listAllMaterials();

  const live = materials.filter((m) => m.active);
  const retired = materials.filter((m) => !m.active);

  return (
    <>
      <AppHeader user={admin} active="/admin/materials" />

      <main className="mx-auto w-full max-w-[880px] px-[26.4px] pb-[80px] pt-[35.2px]">
        <Kicker>Materials</Kicker>
        <h1 className="m-0 mt-[6px] mb-[8px] font-display text-[30px] leading-[1.05] text-ink">
          What you print with
        </h1>
        <p className="m-0 mb-[22px] max-w-[62ch] text-[15px] text-ink-2">
          The materials a request can be made from. Add one (Nylon, ABS,
          PC…) and it appears on the upload form immediately — no redeploy.
          Retire one to take it off the list without touching past requests
          that used it. New materials start at $0/kg on the cost calculator;
          set the real price at <a href="/admin/rates" className="underline underline-offset-2">/admin/rates</a>.
        </p>

        {error && (
          <div className="mb-[17.6px]">
            <Notice tone="warn">{error}</Notice>
          </div>
        )}

        {/* Add */}
        <form
          action={createMaterialAction}
          className="mb-[26.4px] flex flex-wrap items-end gap-[8.8px] rounded-panel border-[3px] border-ink bg-aqua-wash p-[17.6px] shadow-stamp"
        >
          <div className="flex-[1_1_240px]">
            <label htmlFor="new-material" className="mb-[6px] block font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-ink-2">
              Add a material
            </label>
            <input
              id="new-material"
              name="name"
              required
              maxLength={40}
              autoComplete="off"
              placeholder="Nylon"
              className="w-full rounded-card border-[3px] border-ink bg-porcelain px-[15px] py-[11px] text-[16px] text-ink placeholder:text-ink-3"
            />
          </div>
          <button
            type="submit"
            className="stamp cursor-pointer rounded-chip border-[3px] border-ink bg-cherry-dk px-[22px] py-[11px] text-[15px] font-bold text-cream hover:bg-cherry"
          >
            Add
          </button>
        </form>

        {/* Live list */}
        <div className="flex flex-col gap-[11px]">
          {live.map((m) => (
            <div
              key={m.id}
              className="rounded-card border-[3px] border-ink bg-porcelain p-[15px] shadow-stamp"
            >
              <div className="flex flex-wrap items-center gap-[8.8px]">
                <form action={renameMaterialAction} className="flex flex-[1_1_240px] items-center gap-[8px]">
                  <input type="hidden" name="id" value={m.id} />
                  <input
                    name="name"
                    defaultValue={m.name}
                    maxLength={40}
                    aria-label={`Rename ${m.name}`}
                    className="min-w-[140px] flex-1 rounded-[8px] border-[3px] border-ink bg-cream-2 px-[11px] py-[7px] font-bold text-[15px] text-ink"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer rounded-chip border-2 border-ink bg-porcelain px-[12px] py-[6px] font-mono text-[11px] font-bold uppercase text-ink hover:bg-sun"
                  >
                    Save
                  </button>
                </form>

                <form action={setMaterialActiveAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="active" value="false" />
                  <button
                    type="submit"
                    className="cursor-pointer rounded-chip border-2 border-ink bg-cream-2 px-[12px] py-[6px] font-mono text-[11px] font-bold uppercase text-ink-2 hover:bg-cherry-wash"
                  >
                    Retire
                  </button>
                </form>
              </div>
            </div>
          ))}
          {live.length === 0 && (
            <p className="m-0 rounded-card border-[3px] border-dashed border-ink-3 bg-cream-2 px-[15px] py-[13.2px] font-mono text-[12px] uppercase tracking-[0.05em] text-ink-3">
              No materials on the list — add one above, or nobody can request a print.
            </p>
          )}
        </div>

        {/* Retired */}
        {retired.length > 0 && (
          <section className="mt-[35.2px]">
            <h2 className="m-0 mb-[13.2px] font-display text-[20px] text-ink">Retired</h2>
            <div className="flex flex-col gap-[8.8px]">
              {retired.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-[8.8px] rounded-card border-[3px] border-ink bg-cream-2 px-[15px] py-[11px] opacity-80"
                >
                  <span className="font-bold text-[15px] text-ink-2 line-through">{m.name}</span>
                  <form action={setMaterialActiveAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="active" value="true" />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-chip border-2 border-ink bg-porcelain px-[12px] py-[6px] font-mono text-[11px] font-bold uppercase text-ink hover:bg-mint-wash"
                    >
                      Restore
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {toast && <Toast>{toast}</Toast>}
    </>
  );
}
