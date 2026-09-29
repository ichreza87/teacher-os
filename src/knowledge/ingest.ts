import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText, MAX_CHUNKS } from "@/knowledge/chunk";
import { DEFAULT_EMBED_MODEL, toVectorLiteral } from "@/knowledge/embeddings";
import { createProvider, loadProviderSettings } from "@/ai/providers/registry";

export interface IngestInput {
  ownerId: string;
  userId: string;
  teacherId: string;
  schoolId: string | null;
  title: string;
  text: string;
  subject?: string | null;
  level?: string | null;
  source: "upload" | "note" | "import";
  mime?: string | null;
  size?: number | null;
  fileId?: string | null;
  externalId?: string | null;
}

/** Shared ingest pipeline: chunk → embed → store + audit. Used by uploads and imports. */
export async function ingestText(supabase: SupabaseClient, input: IngestInput): Promise<string> {
  const text = input.text.trim();
  if (!text) throw new Error("Tidak ada teks untuk diproses.");
  const chunks = chunkText(text).slice(0, MAX_CHUNKS);

  const { data: doc, error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      owner_user_id: input.ownerId,
      school_id: input.schoolId,
      teacher_id: input.teacherId,
      title: input.title,
      subject: input.subject ?? null,
      education_level_code: input.level ?? null,
      source_type: input.source,
      mime_type: input.mime ?? null,
      size_bytes: input.size ?? null,
      file_id: input.fileId ?? null,
      external_id: input.externalId ?? null,
      status: "processing",
    })
    .select("id")
    .single();
  if (docError || !doc) throw new Error(docError?.message ?? "Gagal menyimpan dokumen.");
  const docId = doc.id as string;

  try {
    const settings = await loadProviderSettings(supabase, input.teacherId);
    const provider = createProvider(settings);
    if (!provider.embed) throw new Error("Provider AI tidak mendukung embedding.");
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 32) {
      const batch = await provider.embed(chunks.slice(i, i + 32), settings.embedModel ?? DEFAULT_EMBED_MODEL);
      vectors.push(...batch);
    }
    const { error: chunkError } = await supabase.from("knowledge_chunks").insert(
      chunks.map((content, i) => ({
        document_id: docId,
        owner_user_id: input.ownerId,
        chunk_index: i,
        content,
        embedding: toVectorLiteral(vectors[i]),
      }))
    );
    if (chunkError) throw new Error(chunkError.message);
    const { error: readyError } = await supabase
      .from("knowledge_documents")
      .update({ status: "ready", chunk_count: chunks.length })
      .eq("id", docId);
    if (readyError) throw new Error(readyError.message);
    await supabase.from("audit_logs").insert({
      actor_id: input.userId, action: "knowledge_ingested", entity_type: "knowledge_document",
      entity_id: docId, metadata: { chunks: chunks.length, source: input.source },
    });
    return docId;
  } catch (e) {
    await supabase.from("knowledge_documents")
      .update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 500) : "unknown" })
      .eq("id", docId);
    throw e;
  }
}
