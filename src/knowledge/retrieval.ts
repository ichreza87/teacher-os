import type { SupabaseClient } from "@supabase/supabase-js";
import { createProvider, loadProviderSettings } from "@/ai/providers/registry";
import { DEFAULT_EMBED_MODEL, toVectorLiteral } from "./embeddings";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  similarity: number;
}

/** Semantic search over the owner's knowledge base. Returns top-k chunks. */
export async function retrieve(
  supabase: SupabaseClient,
  ownerId: string,
  teacherId: string,
  query: string,
  k = 4
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  if (!q) return [];
  const settings = await loadProviderSettings(supabase, teacherId);
  const provider = createProvider(settings);
  if (!provider.embed) throw new Error("Provider AI tidak mendukung embedding.");
  const [vector] = await provider.embed([q], settings.embedModel ?? DEFAULT_EMBED_MODEL);
  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    q_embedding: toVectorLiteral(vector),
    q_owner: ownerId,
    match_count: k,
  });
  if (error) throw new Error(`Pencarian pengetahuan gagal: ${error.message}. Pastikan migrasi 0004 dan ekstensi pgvector aktif.`);
  return ((data ?? []) as {
    chunk_id: string; document_id: string; title: string; content: string; similarity: number;
  }[]).map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    title: r.title,
    content: r.content,
    similarity: r.similarity,
  }));
}
