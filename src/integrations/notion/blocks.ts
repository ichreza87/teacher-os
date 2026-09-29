/** Extract plain text from Notion blocks. Pure + unit-tested. */

interface RichText {
  plain_text?: string;
}

interface Block {
  type?: string;
  [key: string]: unknown;
}

function rich(block: Block, field: string): string {
  const container = block[field] as { rich_text?: RichText[] } | undefined;
  return (container?.rich_text ?? []).map((t) => t.plain_text ?? "").join("");
}

const TEXT_FIELDS = [
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "toggle",
  "quote",
  "callout",
] as const;

export function blockToText(block: Block): string {
  const type = block.type as string | undefined;
  if (!type) return "";
  if ((TEXT_FIELDS as readonly string[]).includes(type)) {
    const prefix =
      type === "bulleted_list_item" ? "- " :
      type === "numbered_list_item" ? "1. " :
      type.startsWith("heading") ? "# " : "";
    return prefix + rich(block, type);
  }
  if (type === "code") {
    return "```\n" + rich(block, "code") + "\n```";
  }
  if (type === "divider") return "---";
  return "";
}

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map(blockToText)
    .map((t) => t.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function pageTitleText(page: { properties?: Record<string, { title?: { plain_text?: string }[] }> }): string {
  for (const prop of Object.values(page.properties ?? {})) {
    if (prop.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text ?? "").join("");
    }
  }
  return "Halaman Notion";
}
