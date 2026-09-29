import type { AIProvider, ChatRequest, ChatResponse, StructuredRequest } from "./types";

export interface OpenAICompatOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/** OpenAI-compatible HTTP provider. Works with OpenAI and any OpenAI-compatible
 *  endpoint (including local models via AI_BASE_URL). API key comes from server
 *  env only — never from the client or database. */
export class OpenAICompatProvider implements AIProvider {
  name = "openai_compat";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(opts: OpenAICompatOptions) {
    if (!opts.apiKey) throw new Error("AI_API_KEY belum diisi di server (.env).");
    if (!opts.model) throw new Error("Model AI belum dipilih di AI Settings.");
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private async complete(messages: { role: string; content: string }[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.3 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Provider AI error ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("Provider AI mengembalikan respons kosong.");
    return text;
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const text = await this.complete([{ role: "system", content: req.system }, ...req.messages]);
    return { text };
  }

  async generateStructured(req: StructuredRequest): Promise<unknown> {
    const text = await this.complete([
      { role: "system", content: `${req.system}\nBalas HANYA dengan JSON valid, tanpa teks lain.` },
      { role: "user", content: `${req.instruction}\nData: ${JSON.stringify(req.data)}` },
    ]);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Provider AI tidak mengembalikan JSON.");
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  }

  async embed(texts: string[], model?: string): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: model || "text-embedding-3-small", input: texts }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Embedding error ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data?: { embedding?: number[] }[] };
    const vectors = json.data?.map((d) => d.embedding).filter((e): e is number[] => Array.isArray(e));
    if (!vectors || vectors.length !== texts.length) {
      throw new Error("Provider embedding mengembalikan jumlah vektor yang salah.");
    }
    return vectors;
  }
}
