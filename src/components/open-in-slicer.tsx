import { mintSlicerToken } from "@/lib/slicer-token";

/**
 * "Open in PrusaSlicer" / "Open in BambuStudio" — two links to custom
 * schemes (`ppp://`, `ppp-bambu://`) that a local helper on the viewer's
 * own machine handles.
 *
 * Why a bare `<a>` to a custom scheme rather than a download, a signed URL,
 * or either slicer's own deep-link scheme:
 *
 *   - `prusaslicer://` only downloads from a hardcoded allowlist
 *     (printables.com, thingiverse.com, cults3d.com); `bambustudioopen://`
 *     only trusts makerworld.com. Neither has a setting to add a host — a
 *     self-hosted instance can never be on either list. See
 *     docs/prusaslicer.md and github.com/bambulab/BambuStudio/issues/6120.
 *   - So the file is fetched by a small helper the printer owner installs
 *     once (`scripts/prusa-open.sh` / `scripts/bambu-open.sh`), which hands
 *     the slicer a *local* path. A local file has no domain to check, so the
 *     allowlist never applies — that is the design, not a loophole.
 *
 * Both links therefore add nothing to the server and need no client bundle:
 * clicking one invokes the OS protocol handler, which is not a fetch, so the
 * CSP does not govern it and there is no JavaScript here. On a machine with
 * no helper installed the click simply does nothing — the copy says as much,
 * and links to the one-time setup.
 *
 * Each link carries the ticket id **and a short-lived credential minted for
 * the person reading this page**, exactly the same shape and lifetime for
 * both slicers — see `src/lib/slicer-token.ts`. Minted per render, good for
 * half an hour, for this model only, and it authorises nothing on its own —
 * the route re-checks the account and re-applies `storyScope`.
 *
 * `DownloadModel` sits beside this rather than inside it: the same bytes with
 * no helper at all, for the printer owner who is not at the machine with a
 * slicer on it. Putting it behind this disclosure would have hidden the plain
 * answer behind the clever one.
 */
export function OpenInSlicer({
  storyId,
  userId,
}: {
  storyId: number;
  /** Who the link credential is minted for. */
  userId: string;
}) {
  const token = mintSlicerToken(userId, storyId);

  return (
    <details className="group mt-[13.2px]">
      <summary className="stamp inline-flex cursor-pointer list-none items-center gap-[8px] rounded-chip border-[3px] border-ink bg-porcelain px-[15px] py-[8px] text-[14px] font-bold text-ink hover:bg-sun">
        {/* An unadorned wedge, not a brand mark — nothing here claims to be Prusa's or Bambu's. */}
        <span aria-hidden className="font-mono text-[15px] leading-none">▸</span>
        Open in a slicer
      </summary>

      <div className="mt-[8.8px] flex flex-wrap gap-[13.2px] rounded-card border-[3px] border-ink bg-cream-2 p-[13.2px]">
        <div>
          <a
            href={`ppp://slice/${storyId}?t=${token}`}
            className="stamp inline-block cursor-pointer rounded-chip border-[3px] border-ink bg-cherry-dk px-[18px] py-[8px] text-[14px] font-bold text-cream hover:bg-cherry"
          >
            Open in PrusaSlicer
          </a>
        </div>
        <div>
          <a
            href={`ppp-bambu://slice/${storyId}?t=${token}`}
            className="stamp inline-block cursor-pointer rounded-chip border-[3px] border-ink bg-aqua px-[18px] py-[8px] text-[14px] font-bold text-ink hover:bg-aqua-wash"
          >
            Open in BambuStudio
          </a>
        </div>
        <p className="m-0 w-full font-mono text-[11px] leading-[1.5] text-ink-2">
          Opens on <strong>this</strong> machine. Needs the one-time helper —
          see{" "}
          <a
            href="https://github.com/danileau/prettypleaseprint/blob/main/docs/prusaslicer.md"
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2 hover:text-cherry-dk"
          >
            the setup
          </a>
          {" "}(one installer sets up both). Nothing happens if the matching
          slicer helper is not installed — the download beside this works
          anywhere.
        </p>
      </div>
    </details>
  );
}
