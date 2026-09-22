import "server-only";

/**
 * Outbound event notifications to a Discord (or Slack-compatible) incoming
 * webhook — a homelab addition on top of the upstream app's in-app-only
 * Activity feed.
 *
 * Deliberately best-effort: a webhook is someone's phone buzzing, not a
 * system of record. The database write in `notify()` already happened by the
 * time this runs, so a failure here never loses anything — it only means
 * nobody's Discord pinged. Errors are logged and swallowed, never thrown,
 * because a print ticket update must never fail because a webhook URL is
 * stale or Discord is down.
 *
 * WEBHOOK_URL accepts a Discord "Incoming Webhook" URL as-is (its JSON body
 * shape, `{ content: "..." }`, is also what Slack's legacy incoming webhooks
 * accept), so this one env var covers both without extra config.
 */
export function webhookConfigured(): boolean {
  return Boolean(process.env.WEBHOOK_URL);
}

export async function postWebhook(text: string): Promise<void> {
  const url = process.env.WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text.slice(0, 1900) }),
    });
    if (!res.ok) {
      console.warn(`[webhook] ${res.status} ${res.statusText} posting to WEBHOOK_URL`);
    }
  } catch (err) {
    console.warn("[webhook] failed to post:", err instanceof Error ? err.message : err);
  }
}
