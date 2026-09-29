import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { MAX_TEXT_CHARS } from "./chunk";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, "pdf" | "docx" | "text" | "csv" | "xlsx"> = {
  pdf: "pdf",
  docx: "docx",
  txt: "text",
  md: "text",
  csv: "csv",
  xlsx: "xlsx",
};

export function detectKind(filename: string): keyof typeof EXTENSIONS | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  return EXTENSIONS[ext] ?? null;
}

/** Validate before parsing. Pure (takes name+size) so it is unit-testable. */
export function validateUpload(file: { name: string; size: number }): { kind: keyof typeof EXTENSIONS } {
  const kind = detectKind(file.name);
  if (!kind) {
    throw new Error("Format belum didukung. Gunakan PDF, DOCX, TXT, MD, CSV, atau XLSX.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File terlalu besar (maks ${MAX_FILE_BYTES / 1024 / 1024} MB).`);
  }
  if (file.size === 0) throw new Error("File kosong.");
  return { kind };
}

function cap(text: string): string {
  const t = text.replace(/\r\n?/g, "\n").trim();
  return t.length > MAX_TEXT_CHARS ? t.slice(0, MAX_TEXT_CHARS) : t;
}

/** Extract readable text from a file buffer. Throws honest errors on failure. */
export async function parseBuffer(buffer: Buffer, filename: string): Promise<{ text: string; kind: string }> {
  const { kind } = validateUpload({ name: filename, size: buffer.length });

  try {
    switch (kind) {
      case "pdf": {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        try {
          const out = await parser.getText();
          return { text: cap(out.text ?? ""), kind };
        } finally {
          await parser.destroy();
        }
      }
      case "docx": {
        const out = await mammoth.extractRawText({ buffer });
        return { text: cap(out.value ?? ""), kind };
      }
      case "xlsx": {
        const wb = XLSX.read(buffer, { type: "buffer" });
        const parts: string[] = [];
        for (const name of wb.SheetNames.slice(0, 10)) {
          parts.push(`# ${name}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[name]).slice(0, 50_000));
        }
        return { text: cap(parts.join("\n\n")), kind };
      }
      case "csv":
      case "text": {
        return { text: cap(buffer.toString("utf-8")), kind };
      }
    }
  } catch (e) {
    throw new Error(`Gagal membaca ${filename}: ${e instanceof Error ? e.message : "format tidak valid"}.`);
  }
  throw new Error("Unreachable.");
}
