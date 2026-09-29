/** Notion OAuth helpers (pure URL building + token exchange via fetch). */

export function buildAuthorizeUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    owner: "user",
    state: opts.state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export interface NotionToken {
  access_token: string;
  workspace_name?: string;
  bot_id?: string;
}

export async function exchangeCode(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<NotionToken> {
  const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString("base64");
  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Notion OAuth gagal (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as NotionToken;
  if (!json.access_token) throw new Error("Notion tidak mengembalikan access token.");
  return json;
}
