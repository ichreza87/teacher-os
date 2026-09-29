import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, parseBuffer, validateUpload } from "@/knowledge/parser";

describe("validateUpload", () => {
  it("accepts supported formats", () => {
    expect(validateUpload({ name: "materi.pdf", size: 100 }).kind).toBe("pdf");
    expect(validateUpload({ name: "RPP.DOCX", size: 100 }).kind).toBe("docx");
    expect(validateUpload({ name: "nilai.csv", size: 100 }).kind).toBe("csv");
  });

  it("rejects unsupported formats", () => {
    expect(() => validateUpload({ name: "foto.png", size: 100 })).toThrow();
    expect(() => validateUpload({ name: "tanpa-ekstensi", size: 100 })).toThrow();
  });

  it("rejects oversize and empty files", () => {
    expect(() => validateUpload({ name: "a.pdf", size: MAX_FILE_BYTES + 1 })).toThrow();
    expect(() => validateUpload({ name: "a.pdf", size: 0 })).toThrow();
  });
});

describe("parseBuffer", () => {
  it("parses plain text", async () => {
    const { text, kind } = await parseBuffer(Buffer.from("Halo\ndunia", "utf-8"), "a.txt");
    expect(kind).toBe("text");
    expect(text).toContain("Halo");
  });

  it("parses csv as text", async () => {
    const { text } = await parseBuffer(Buffer.from("nama,nilai\nA,90", "utf-8"), "n.csv");
    expect(text).toContain("nama");
  });

  it("fails honestly on corrupt pdf", async () => {
    await expect(parseBuffer(Buffer.from("bukan pdf sama sekali"), "x.pdf")).rejects.toThrow();
  });

  it("rejects unsupported type before parsing", async () => {
    await expect(parseBuffer(Buffer.from("x"), "x.png")).rejects.toThrow();
  });
});
