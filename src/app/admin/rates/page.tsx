import { redirect } from "next/navigation";

/**
 * The machine rate moved to /admin/catalog, next to the per-material filament
 * rates, so the whole cost calculator lives in one place. This route is kept
 * as a redirect so old bookmarks still land somewhere useful.
 */
export default function RatesPage() {
  redirect("/admin/catalog");
}
