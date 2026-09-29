import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Trial/demo session (admin/admin) agar aplikasi bisa dijelajahi tanpa Supabase.
 * - Aktif by default di development; di production hanya bila DEMO_MODE=true.
 * - Sesi = cookie httpOnly bertanda HMAC (BUKAN JWT, tidak ada data sensitif).
 * - Mode demo selalu memakai dataset contoh + banner yang jelas. Bukan auth produksi.
 */

export const DEMO_COOKIE = "tos_demo";
export const DEMO_USER = "admin";
const DEMO_PASS = "admin";

function demoKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY || "teacher-os-dev-demo-key";
  return Buffer.from(raw);
}

export function isDemoEnabled(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function signDemoToken(user: string, expiresAt: number): string {
  const payload = `${user}.${expiresAt}`;
  const sig = createHmac("sha256", demoKey()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyDemoToken(token: string): { user: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [user, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!user || !Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const expected = createHmac("sha256", demoKey()).update(`${user}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { user };
}

export function checkDemoCredentials(user: string, pass: string): boolean {
  const a = Buffer.from(user);
  const b = Buffer.from(DEMO_USER);
  const c = Buffer.from(pass);
  const d = Buffer.from(DEMO_PASS);
  return (
    a.length === b.length && timingSafeEqual(a, b) &&
    c.length === d.length && timingSafeEqual(c, d)
  );
}

/** Server-side: baca sesi demo dari cookie (sudah diverifikasi). */
export function getDemoSession(): { user: string } | null {
  if (!isDemoEnabled()) return null;
  const token = cookies().get(DEMO_COOKIE)?.value;
  if (!token) return null;
  return verifyDemoToken(token);
}

export function demoExpiry(): number {
  return Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
}

/** Sapaan waktu Indonesia berdasarkan jam (0-23). Pure + tested. */
export function timeGreeting(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}
