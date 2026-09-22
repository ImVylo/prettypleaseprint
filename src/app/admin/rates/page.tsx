import { requireAdmin } from "@/lib/authz";
import { listMaterialRates, machineRate } from "@/lib/cost";
import { AppHeader } from "@/components/app-header";
import { Kicker, Notice } from "@/components/ui";
import { Toast } from "@/components/toast";
import { setMachineRateAction, setMaterialRateAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Manage the cost-calculator rates — $/kg per material and the shared
 * $/hour machine rate. Admin-only, same shape as /admin/benefits.
 *
 * These feed src/lib/cost.ts, which computes a ticket's cost only once its
 * owner has entered actual weight and/or print time — never from a guess.
 */
export default async function RatesPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string; error?: string }>;
}) {
  const [{ toast, error }, admin] = await Promise.all([searchParams, requireAdmin()]);
  const [materials, hourly] = await Promise.all([listMaterialRates(), machineRate()]);

  return (
    <>
      <AppHeader user={admin} active="/admin/rates" />

      <main className="mx-auto w-full max-w-[880px] px-[26.4px] pb-[80px] pt-[35.2px]">
        <Kicker>Cost calculator</Kicker>
        <h1 className="m-0 mt-[6px] mb-[8px] font-display text-[30px] leading-[1.05] text-ink">
          What a print costs
        </h1>
        <p className="m-0 mb-[22px] max-w-[62ch] text-[15px] text-ink-2">
          Filament price per kilogram, by material, plus one shared machine
          rate for electricity and wear. A ticket only shows a cost once you
          record what it actually used — see the ticket page. Nothing here is
          ever guessed from a file's size.
        </p>

        {error && (
          <div className="mb-[17.6px]">
            <Notice tone="warn">{error}</Notice>
          </div>
        )}

        <section className="mb-[26.4px]">
          <h2 className="m-0 mb-[13.2px] font-display text-[20px] text-ink">Filament, per kg</h2>
          <div className="flex flex-col gap-[8.8px]">
            {materials.map((m) => (
              <form
                key={m.material}
                action={setMaterialRateAction}
                className="flex flex-wrap items-center gap-[8.8px] rounded-card border-[3px] border-ink bg-porcelain p-[13.2px] shadow-stamp"
              >
                <input type="hidden" name="material" value={m.material} />
                <span className="w-[70px] font-mono text-[13px] font-bold uppercase text-ink">
                  {m.material}
                </span>
                <span className="text-[14px] text-ink-2">$</span>
                <input
                  name="dollarsPerKg"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={m.dollarsPerKg}
                  aria-label={`${m.material} price per kilogram`}
                  className="w-[100px] rounded-[8px] border-[3px] border-ink bg-cream-2 px-[11px] py-[7px] font-bold text-[15px] text-ink"
                />
                <span className="text-[13px] text-ink-3">/ kg</span>
                <button
                  type="submit"
                  className="stamp ml-auto cursor-pointer rounded-chip border-2 border-ink bg-porcelain px-[15px] py-[7px] font-mono text-[11px] font-bold uppercase text-ink hover:bg-sun"
                >
                  Save
                </button>
              </form>
            ))}
          </div>
        </section>

        <section>
          <h2 className="m-0 mb-[13.2px] font-display text-[20px] text-ink">Machine, per hour</h2>
          <form
            action={setMachineRateAction}
            className="flex flex-wrap items-center gap-[8.8px] rounded-card border-[3px] border-ink bg-aqua-wash p-[13.2px] shadow-stamp"
          >
            <span className="text-[14px] text-ink-2">$</span>
            <input
              name="dollarsPerHour"
              type="number"
              min={0}
              step="0.01"
              defaultValue={hourly}
              aria-label="Machine rate per hour"
              className="w-[100px] rounded-[8px] border-[3px] border-ink bg-porcelain px-[11px] py-[7px] font-bold text-[15px] text-ink"
            />
            <span className="text-[13px] text-ink-3">/ hour — electricity, wear, amortised upkeep</span>
            <button
              type="submit"
              className="stamp ml-auto cursor-pointer rounded-chip border-[3px] border-ink bg-cherry-dk px-[18px] py-[8px] text-[14px] font-bold text-cream hover:bg-cherry"
            >
              Save
            </button>
          </form>
        </section>
      </main>

      {toast && <Toast>{toast}</Toast>}
    </>
  );
}
