import { google } from "googleapis";

/** Minimal OAuth scopes (least privilege). */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.events",
];

/** Pure URL builder (no network) — unit-tested. */
export function buildGoogleAuthUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
  const oauth = new google.auth.OAuth2(opts.clientId, "unused", opts.redirectUri);
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state: opts.state,
  });
}

export interface GoogleTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

export async function exchangeGoogleCode(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<GoogleTokens> {
  const oauth = new google.auth.OAuth2(opts.clientId, opts.clientSecret, opts.redirectUri);
  const { tokens } = await oauth.getToken(opts.code);
  if (!tokens.access_token) throw new Error("Google tidak mengembalikan access token.");
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  };
}

export function googleClientFromTokens(opts: {
  clientId: string;
  clientSecret: string;
  tokens: GoogleTokens;
}) {
  const oauth = new google.auth.OAuth2(opts.clientId, opts.clientSecret);
  oauth.setCredentials({
    access_token: opts.tokens.access_token ?? undefined,
    refresh_token: opts.tokens.refresh_token ?? undefined,
    expiry_date: opts.tokens.expiry_date ?? undefined,
  });
  return oauth;
}
