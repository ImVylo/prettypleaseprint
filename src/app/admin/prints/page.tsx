import { redirect } from "next/navigation";

/**
 * Folded into /history, which now has a "Who" filter for exactly this
 * question. Kept as a redirect so old bookmarks and any shared links still
 * land somewhere useful.
 */
export default function PrintsByPersonPage() {
  redirect("/history");
}
