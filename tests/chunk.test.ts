import { describe, expect, it } from "vitest";
import { chunkText } from "@/knowledge/chunk";

describe("chunkText", () => {
  it("returns empty for blank input", () => {
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("keeps short text as one chunk", () => {
    expect(chunkText("Halo dunia.")).toEqual(["Halo dunia."]);
  });

  it("splits long text into bounded chunks with overlap", () => {
    const para = (n: number) => `Paragraf ${n} ` + "kata ".repeat(120);
    const text = Array.from({ length: 10 }, (_, i) => para(i)).join("\n\n");
    const chunks = chunkText(text, { maxChars: 1000, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1000 + 200); // word-boundary slack
    }
    // Overlap: some content is shared between consecutive chunks.
    const shared = chunks.slice(1).some((c, i) => {
      const prevWords = new Set(chunks[i].split(/\s+/));
      return c.split(/\s+/).some((w) => prevWords.has(w) && w.length > 5);
    });
    expect(shared).toBe(true);
    // Coverage: every paragraph marker survives somewhere.
    for (let i = 0; i < 10; i++) {
      expect(chunks.some((c) => c.includes(`Paragraf ${i}`))).toBe(true);
    }
  });

  it("hard-splits a single oversized paragraph", () => {
    const text = "kata ".repeat(2000);
    const chunks = chunkText(text, { maxChars: 1000, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1200);
    }
  });
});
