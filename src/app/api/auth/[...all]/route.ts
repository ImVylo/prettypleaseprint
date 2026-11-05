import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/invites";

/**
 * Every Better Auth endpoint — sign-up, username sign-in, reset-password,
 * passkey register/authenticate, session, sign-out, admin — hangs off this
 * one catch-all. Nothing else in the app mints or reads credentials directly.
 */
const handlers = toNextJsHandler(auth.handler);

/**
 * Sign-up must not answer "that address already has an account".
 *
 * The invite gate in `src/lib/auth.ts` refuses a stranger and an invited
 * address without its link with the *same* answer, on purpose. But Better Auth
 * looks for an existing email before it runs that gate, so this endpoint was
 * answering 422 for a member, 403 for a stranger and 200 for an address that
 * could claim — a membership oracle anyone could query without signing in.
 *
 * The duplicate case is answered exactly like the gate instead. A legitimate
 * claim is unaffected: `acceptInvite` calls `auth.api.signUpEmail` in process,
 * so it never reaches this HTTP route at all.
 */
export const POST: typeof handlers.POST = async (request) => {
  const { pathname } = new URL(request.url);
  if (pathname.endsWith("/sign-up/email")) {
    const body = (await request
      .clone()
      .json()
      .catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (email) {
      const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        return Response.json(
          {
            code: "invite_required",
            message: "BYD Printing is invite-only. Ask the printer owner for a link.",
          },
          { status: 403 },
        );
      }
    }
  }
  return handlers.POST(request);
};

export const GET = handlers.GET;
