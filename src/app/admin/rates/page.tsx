import { requireAdmin } from "@/lib/authz";
import { machineRate } from "@/lib/cost";
import { AppHeader } from "@/components/app-header";
import { Kicker, Notice } from "@/components/ui";
import { Toast } from "@/components/toast";
import { setMachineRateAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * The one shared machine rate — electricity, wear, amortised upkeep.
 *
 * Per-material $/kg pricing lives at /admin/materials now, next to the
 * material itself: a material and its price are one fact, and splitting
 * them across two pages meant they could say different things about the
 * same material with nothing to notice. This page is only for the number
 * that isn't a property of any one material.
 */
export default async function RatesPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string; error?: string }>;
}) {
  const [{ toast, error }, admin] = await Promise.all([searchParams, requireAdmin()]);
  const hourly = await machineRate();

  return (
    <>
      <AppHeader user={admin} active="/admin/rates" />

      <main className="mx-auto w-full max-w-[880px] px-[26.4px] pb-[80px] pt-[35.2px]">
        <Kicker>Cost calculator</Kicker>
        <h1 className="m-0 mt-[6px] mb-[8px] font-display text-[30px] leading-[1.05] text-ink">
          Machine time
        </h1>
        <p className="m-0 mb-[22px] max-w-[62ch] text-[15px] text-ink-2">
          One shared rate for electricity and wear, applied to however many
          minutes a ticket actually took. Filament pricing, per material, is
          at{" "}
          <a href="/admin/materials" className="underline underline-offset-2">/admin/materials</a>{" "}
          now — next to the material itself. A ticket only shows a cost once
          you record what it actually used, on the ticket page. Nothing here
          is ever guessed from a file&rsquo;s size.
        </p>

        {error && (
          <div className="mb-[17.6px]">
            <Notice tone="warn">{error}</Notice>
          </div>
        )}

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
      </main>

      {toast && <Toast>{toast}</Toast>}
    </>
  );
}
