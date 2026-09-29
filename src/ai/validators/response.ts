import { validateActionPayload } from "@/ai/actions/schemas";

/** Validate raw provider output before it becomes a proposed action.
 *  Never JSON.parse with regex, never trust unknown shapes. */
export function validateProviderOutput(output: unknown):
  | { ok: true; type: string; payload: unknown }
  | { ok: false; error: string } {
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    return { ok: false, error: "Output AI bukan objek." };
  }
  const o = output as Record<string, unknown>;
  if (typeof o.type !== "string" || o.payload === undefined) {
    return { ok: false, error: "Output AI tidak memiliki type/payload." };
  }
  const v = validateActionPayload(o.type, o.payload);
  if (!v.ok) return v;
  return { ok: true, type: v.type, payload: v.payload };
}
