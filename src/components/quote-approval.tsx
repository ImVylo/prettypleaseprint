import { approveQuote, declineQuote } from "@/app/actions/stories";

/**
 * The requester's side of a quote: the frozen price the owner sent, and the
 * two ways out. Approve puts the ticket on the rail for real; decline is
 * terminal.
 */
export function QuoteApproval({
  storyId,
  total,
}: {
  storyId: number;
  total: number | null;
}) {
  return (
    <section className="mt-[17.6px] rounded-panel border-[3px] border-ink bg-sun-wash p-[17.6px]">
      <h2 className="m-0 mb-[6px] font-display text-[22px] text-ink">
        Your quote: {total != null ? `$${total.toFixed(2)}` : "—"}
      </h2>
      <p className="m-0 mb-[13.2px] text-[14px] text-ink-2">
        The printer owner priced this print. Approve to send it to the queue, or decline.
      </p>
      <div className="flex flex-wrap gap-[8.8px]">
        <form action={approveQuote}>
          <input type="hidden" name="storyId" value={storyId} />
          <button
            type="submit"
            className="stamp cursor-pointer rounded-chip border-[3px] border-ink bg-mint px-[18px] py-[8px] text-[14px] font-bold text-ink hover:bg-mint-wash"
          >
            Approve
          </button>
        </form>
        <form action={declineQuote}>
          <input type="hidden" name="storyId" value={storyId} />
          <button
            type="submit"
            className="stamp cursor-pointer rounded-chip border-[3px] border-ink bg-porcelain px-[18px] py-[8px] text-[14px] font-bold text-ink hover:bg-cherry-wash"
          >
            Decline
          </button>
        </form>
      </div>
    </section>
  );
}
