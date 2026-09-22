import { estimateCost, formatDollars, rateTable } from "@/lib/cost";
import { recordActualsAction } from "@/app/admin/rates/actions";

/**
 * The ticket's cost, computed only from what has actually been measured —
 * see src/lib/cost.ts. The admin form to fill those numbers in lives here
 * too, since the two are only ever looked at together.
 */
export async function CostPanel({
  storyId,
  material,
  weightGrams,
  printMinutes,
  isAdmin,
  from,
}: {
  storyId: number;
  material: string;
  weightGrams: number | null;
  printMinutes: number | null;
  isAdmin: boolean;
  from: string;
}) {
  const rates = await rateTable();
  const cost = estimateCost(material, weightGrams, printMinutes, rates);

  return (
    <div className="mt-[17.6px] rounded-panel border-[3px] border-ink bg-mint-wash p-[17.6px]">
      <div className="mb-[8px] font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
        Cost
      </div>

      {cost ? (
        <div className="flex flex-wrap items-baseline gap-[13.2px]">
          <span className="font-display text-[26px] text-ink">{formatDollars(cost.total)}</span>
          <span className="font-mono text-[12px] text-ink-3">
            {weightGrams ? `${formatDollars(cost.materialCost)} filament` : null}
            {weightGrams && printMinutes ? " + " : null}
            {printMinutes ? `${formatDollars(cost.machineCost)} machine time` : null}
          </span>
        </div>
      ) : (
        <p className="m-0 text-[14px] text-ink-2">
          Not costed yet — nothing has been weighed or timed.
        </p>
      )}

      {isAdmin && (
        <form
          action={recordActualsAction}
          className="mt-[13.2px] flex flex-wrap items-end gap-[8.8px]"
        >
          <input type="hidden" name="storyId" value={storyId} />
          <input type="hidden" name="from" value={from} />
          <div>
            <label
              htmlFor={`weight-${storyId}`}
              className="mb-[4px] block font-mono text-[10.5px] font-bold uppercase text-ink-2"
            >
              Weight (g)
            </label>
            <input
              id={`weight-${storyId}`}
              name="weightGrams"
              type="number"
              min={0}
              defaultValue={weightGrams ?? ""}
              placeholder="e.g. 38"
              className="w-[100px] rounded-[8px] border-[3px] border-ink bg-porcelain px-[9px] py-[6px] text-[14px] text-ink placeholder:text-ink-3"
            />
          </div>
          <div>
            <label
              htmlFor={`minutes-${storyId}`}
              className="mb-[4px] block font-mono text-[10.5px] font-bold uppercase text-ink-2"
            >
              Print time (min)
            </label>
            <input
              id={`minutes-${storyId}`}
              name="printMinutes"
              type="number"
              min={0}
              defaultValue={printMinutes ?? ""}
              placeholder="e.g. 95"
              className="w-[110px] rounded-[8px] border-[3px] border-ink bg-porcelain px-[9px] py-[6px] text-[14px] text-ink placeholder:text-ink-3"
            />
          </div>
          <button
            type="submit"
            className="stamp cursor-pointer rounded-chip border-[3px] border-ink bg-porcelain px-[15px] py-[7px] text-[13px] font-bold text-ink hover:bg-sun"
          >
            Save actuals
          </button>
        </form>
      )}
    </div>
  );
}
