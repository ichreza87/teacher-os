import { Client } from "@notionhq/client";
import { blocksToText, pageTitleText } from "./blocks";

/** Create a Notion API client from a decrypted token. Token stays server-side. */
export function createNotionClient(token: string): Client {
  return new Client({ auth: token });
}

export interface NotionPageSummary {
  id: string;
  title: string;
  url?: string;
}

interface SearchResult {
  results?: {
    object?: string;
    id?: string;
    url?: string;
    properties?: Record<string, { title?: { plain_text?: string }[] }>;
  }[];
}

export async function searchPages(client: Client, query: string): Promise<NotionPageSummary[]> {
  const res = (await client.search({ query, page_size: 20 })) as unknown as SearchResult;
  return (res.results ?? [])
    .filter((r) => r.object === "page" && r.id)
    .map((r) => ({
      id: r.id as string,
      title: pageTitleText({ properties: r.properties ?? {} }),
      url: r.url,
    }));
}

interface BlocksResult {
  results?: Record<string, unknown>[];
  has_more?: boolean;
  next_cursor?: string | null;
}

export async function fetchPageText(
  client: Client,
  pageId: string
): Promise<{ title: string; text: string }> {
  const page = (await client.pages.retrieve({ page_id: pageId })) as unknown as {
    properties?: Record<string, { title?: { plain_text?: string }[] }>;
  };
  const title = pageTitleText({ properties: page.properties });
  const blocks: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  do {
    const res = (await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    })) as unknown as BlocksResult;
    blocks.push(...(res.results ?? []));
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return { title, text: blocksToText(blocks) };
}

export async function exportText(
  client: Client,
  parentPageId: string,
  title: string,
  content: string
): Promise<string> {
  // When the parent is a page, the API takes properties.title as the title array.
  // The SDK's create-params type does not model this; cast preserves the runtime shape.
  type CreateParams = Parameters<Client["pages"]["create"]>[0];
  const page = (await client.pages.create({
    parent: { page_id: parentPageId },
    properties: { title: [{ type: "text", text: { content: title.slice(0, 100) } }] },
  } as unknown as CreateParams)) as unknown as { id: string; url?: string };
  const paras = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 100);
  for (let i = 0; i < paras.length; i += 50) {
    await client.blocks.children.append({
      block_id: page.id,
      children: paras.slice(i, i + 50).map((p) => ({
        type: "paragraph" as const,
        paragraph: { rich_text: [{ type: "text" as const, text: { content: p.slice(0, 2000) } }] },
      })),
    });
  }
  return page.url ?? "Tersimpan di Notion (tanpa link).";
}
