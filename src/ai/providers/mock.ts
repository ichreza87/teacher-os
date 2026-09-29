import { createHash } from "crypto";
import { EMBEDDING_DIM } from "@/knowledge/embeddings";
import type { AIProvider, ChatRequest, ChatResponse, StructuredRequest } from "./types";

/** Deterministic offline provider: no API key, no network.
 *  Used for development, tests, and the default onboarding choice. */
export class MockProvider implements AIProvider {
  name = "mock";

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
    const hint = lastUser ? lastUser.content.slice(0, 160) : "pekerjaan Anda";
    return {
      text:
        `Saya memahami permintaan "${hint}". ` +
        `Sebagai MockProvider saya tidak memanggil model eksternal: gunakan workspace ini untuk menguji alur ` +
        `(konteks → usulan aksi → pratinjau → konfirmasi). ` +
        `Minta saya membuat modul, asesmen, materi, tugas, atau agenda, dan saya akan menyusun usulan terstruktur untuk Anda setujui.`,
    };
  }

  async generateStructured(req: StructuredRequest): Promise<unknown> {
    // Echo the slot data back as the payload skeleton; validators enforce shape.
    if (req.data !== null && typeof req.data === "object") return req.data;
    throw new Error("MockProvider: no structured data provided.");
  }

  /** Deterministic EMBEDDING_DIM pseudo-embedding for offline RAG plumbing.
   *  Same text → same vector; different texts → distant vectors (hash-based). */
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => {
      const out: number[] = [];
      for (let i = 0; out.length < EMBEDDING_DIM; i++) {
        const h = createHash("sha256").update(`${t}:${Math.floor(i / 32)}`).digest();
        for (let j = 0; j < 32 && out.length < EMBEDDING_DIM; j++) {
          out.push(h[j] / 255);
        }
      }
      return out;
    });
  }
}
