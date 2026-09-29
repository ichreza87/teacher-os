import { PostHog } from "posthog-node";

/**
 * Privacy-conscious product analytics wrapper.
 * - No-op when POSTHOG_KEY is missing or ANALYTICS_ENABLED=false.
 * - NEVER pass student PII (names, NISN, scores, feedback): scrub() drops
 *   blocklisted keys and truncates long strings.
 * - Fire-and-forget: analytics must never break user flows.
 */

const SENSITIVE_KEYS = new Set([
  "full_name", "name", "nisn", "email", "phone", "address",
  "score", "feedback", "content", "body", "message",
]);

const MAX_STR = 200;

export function scrubProps(props: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, MAX_STR);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    // objects/arrays dropped: may nest PII.
  }
  return out;
}

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (process.env.ANALYTICS_ENABLED === "false") return null;
  const key = process.env.POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST || "https://app.posthog.com",
      flushAt: 1,
    });
  }
  return client;
}

/** Track a server-side event. Returns true if accepted for delivery. */
export function track(userId: string, event: string, props: Record<string, unknown> = {}): boolean {
  try {
    const c = getClient();
    if (!c) return false;
    c.capture({ distinctId: userId, event, properties: scrubProps(props) });
    void c.flush().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
