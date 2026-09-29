/** Email domain allowlist for login. Edge-safe (plain string ops) — used by middleware.
 *
 *  Belajar.id accounts live on subdomains (guru.sma.belajar.id, guru.sd.belajar.id,
 *  ...), so Google's `hd` parameter cannot cover them all. Instead we verify the
 *  domain AFTER OAuth: exact match or any subdomain of an allowed domain.
 */

export function getAllowedDomains(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (env.ALLOWED_LOGIN_DOMAINS ?? "belajar.id")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return raw.length > 0 ? raw : ["belajar.id"];
}

export function isAllowedEmail(email: string, allowed: string[] = getAllowedDomains()): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return false;
  return allowed.some((d) => domain === d || domain.endsWith(`.${d}`));
}
