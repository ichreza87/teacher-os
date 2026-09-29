import { describe, expect, it } from "vitest";
import { blockToText, blocksToText, pageTitleText } from "@/integrations/notion/blocks";
import { buildAuthorizeUrl } from "@/integrations/notion/oauth";
import { buildGoogleAuthUrl, GOOGLE_SCOPES } from "@/integrations/google/oauth";

describe("notion blocks", () => {
  it("extracts text with prefixes", () => {
    expect(blockToText({
      type: "heading_1",
      heading_1: { rich_text: [{ plain_text: "Judul" }] },
    })).toBe("# Judul");
    expect(blockToText({
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ plain_text: "poin" }] },
    })).toBe("- poin");
    expect(blockToText({ type: "divider" })).toBe("---");
    expect(blockToText({ type: "image" })).toBe("");
  });

  it("joins blocks skipping empties", () => {
    const text = blocksToText([
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Satu" }] } },
      { type: "paragraph", paragraph: { rich_text: [] } },
      { type: "quote", quote: { rich_text: [{ plain_text: "Dua" }] } },
    ]);
    expect(text).toBe("Satu\n\nDua");
  });

  it("finds title property", () => {
    expect(pageTitleText({ properties: { Nama: { title: [{ plain_text: "RPP" }] } } })).toBe("RPP");
    expect(pageTitleText({})).toBe("Halaman Notion");
  });
});

describe("oauth urls", () => {
  it("builds notion authorize url", () => {
    const url = buildAuthorizeUrl({ clientId: "cid", redirectUri: "http://x/cb", state: "user-1" });
    expect(url).toContain("api.notion.com/v1/oauth/authorize");
    expect(url).toContain("client_id=cid");
    expect(url).toContain("state=user-1");
  });

  it("builds google url with minimal scopes", () => {
    const url = buildGoogleAuthUrl({ clientId: "cid", redirectUri: "http://x/cb", state: "user-1" });
    expect(url).toContain("accounts.google.com");
    for (const s of GOOGLE_SCOPES) {
      expect(url).toContain(encodeURIComponent(s));
    }
    // Least privilege: no gmail.send, no full drive scope.
    expect(url).not.toContain("gmail.send");
    expect(url).not.toContain("auth%2Fdrive&");
  });
});
