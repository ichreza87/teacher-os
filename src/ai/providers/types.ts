/** AI provider abstraction. App code depends on this interface, never on an SDK. */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  text: string;
}

export interface StructuredRequest {
  system: string;
  /** Instruction describing the JSON to produce. The provider must return raw JSON. */
  instruction: string;
  /** The exact payload hint (slots) to fill in. */
  data: unknown;
}

export interface AIProvider {
  name: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
  /** Returns unknown on purpose: callers MUST validate via ai/validators. */
  generateStructured(req: StructuredRequest): Promise<unknown>;
  /** All vectors MUST have EMBEDDING_DIM dimensions (see knowledge/embeddings). */
  embed?(texts: string[], model?: string): Promise<number[][]>;
}
