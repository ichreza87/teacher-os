/** Parent-communication helpers: template rendering + manual-send links. Pure + tested. */

export const PLACEHOLDERS = ["nama_siswa", "nama_guru", "kelas", "sekolah", "tanggal"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

export interface RenderResult {
  text: string;
  /** Placeholders present in the template but missing from vars. */
  missing: string[];
}

export function renderTemplate(body: string, vars: Partial<Record<Placeholder, string>>): RenderResult {
  const missing = new Set<string>();
  const text = body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    if (!(PLACEHOLDERS as readonly string[]).includes(key)) {
      missing.add(key);
      return match;
    }
    const value = vars[key as Placeholder];
    if (!value) {
      missing.add(key);
      return match;
    }
    return value;
  });
  return { text, missing: Array.from(missing) };
}

/** Build a wa.me link for MANUAL sending (the app never sends itself).
 *  Returns null when no usable phone number is available. */
export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (digits.length < 9 || digits.length > 16) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type LogStatus = "draft" | "approved" | "sent" | "cancelled";

/** Allowed status transitions. Sending is always manual; 'sent' only marks
 *  that the teacher confirms having sent the message outside the app. */
export function canTransition(from: LogStatus, to: LogStatus): boolean {
  if (from === "draft") return to === "approved" || to === "cancelled";
  if (from === "approved") return to === "sent" || to === "cancelled";
  return false;
}
