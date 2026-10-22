import { Button, Input } from "@/components/ui";
import { setMaterialRateAction } from "./actions";

/**
 * The per-material $/kg filament price, edited next to the material itself —
 * the fork's cost calculator, kept when the old /admin/materials page was
 * folded into the upstream catalog.
 */
export function MaterialRateForm({
  materialId,
  materialName,
  dollarsPerKg,
}: {
  materialId: string;
  materialName: string;
  dollarsPerKg: number;
}) {
  return (
    <form
      action={setMaterialRateAction}
      className="mb-[17.6px] flex items-center gap-[8px] rounded-card border-2 border-dashed border-rule bg-cream px-[11px] py-[8.8px]"
    >
      <input type="hidden" name="materialId" value={materialId} />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
        Filament
      </span>
      <span className="text-[14px] text-ink-2">$</span>
      <Input
        name="dollarsPerKg"
        type="number"
        min={0}
        step="0.01"
        defaultValue={dollarsPerKg}
        aria-label={`Filament rate per kg for ${materialName}`}
        className="w-[90px] px-[10px] py-[7px] text-[14px]"
      />
      <span className="text-[13px] text-ink-3">/ kg</span>
      <Button type="submit" variant="ghost" className="ml-auto px-[12px] py-[6px] text-[13px]">
        Save
      </Button>
    </form>
  );
}
