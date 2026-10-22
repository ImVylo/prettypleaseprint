import { changeStoryRequester } from "@/app/actions/stories";

/**
 * Reassign who asked for a print, from a list view (History) where the full
 * AdminActions panel would be overkill. Owner-only — the action re-checks.
 */
export function ReassignStory({
  storyId,
  requesters,
}: {
  storyId: number;
  requesters: { id: string; name: string }[];
}) {
  return (
    <details>
      <summary className="stamp inline-block cursor-pointer list-none rounded-chip border-[3px] border-ink bg-porcelain px-[13px] py-[6px] text-[13px] font-bold text-ink hover:bg-aqua-wash [&::-webkit-details-marker]:hidden">
        Reassign
      </summary>
      <form action={changeStoryRequester} className="mt-[6px] flex flex-wrap items-center gap-[6px]">
        <input type="hidden" name="storyId" value={storyId} />
        <select
          name="requesterId"
          required
          defaultValue=""
          className="min-w-[150px] rounded-[8px] border-[3px] border-ink bg-porcelain px-[8px] py-[6px] text-[13px] text-ink"
        >
          <option value="" disabled>
            Who asked for it?
          </option>
          {requesters.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="stamp cursor-pointer rounded-chip border-[3px] border-ink bg-aqua px-[12px] py-[6px] text-[13px] font-bold text-ink"
        >
          Change
        </button>
      </form>
    </details>
  );
}
