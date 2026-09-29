"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSchoolContext } from "@/lib/school";
import { track } from "@/lib/analytics";
import { parseBuffer, validateUpload } from "@/knowledge/parser";
import { ingestText } from "@/knowledge/ingest";
import { buildKey, StorageUnconfiguredError } from "@/integrations/storage/types";
import { getStorageBackend } from "@/integrations/storage/factory";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const metaSchema = z.object({
  title: z.string().trim().optional().or(z.literal("")),
  subject: z.string().trim().optional().or(z.literal("")),
  level: z.string().trim().optional().or(z.literal("")),
});

export async function uploadDocument(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/knowledge/new", res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const file = formData.get("file");
  if (!(file instanceof File)) fail("/knowledge/new", "Pilih file terlebih dahulu.");
  let kind: string;
  try {
    ({ kind } = validateUpload({ name: file.name, size: file.size }));
  } catch (e) {
    fail("/knowledge/new", e instanceof Error ? e.message : "File tidak valid.");
  }

  const meta = metaSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    level: String(formData.get("level") ?? ""),
  });
  if (!meta.success) fail("/knowledge/new", "Metadata tidak valid.");

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    ({ text } = await parseBuffer(buffer, file.name));
  } catch (e) {
    fail("/knowledge/new", e instanceof Error ? e.message : "Gagal membaca file.");
  }
  if (!text.trim()) fail("/knowledge/new", "Tidak ada teks yang bisa diekstrak dari file ini.");

  // Store original bytes when a backend is configured; ingest proceeds regardless.
  let fileId: string | null = null;
  try {
    const backend = getStorageBackend(supabase);
    const key = buildKey(userId, "knowledge", file.name, randomUUID());
    await backend.put(key, buffer, file.type || "application/octet-stream");
    const { data: f, error: fError } = await supabase
      .from("files")
      .insert({
        owner_user_id: userId,
        filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        storage_key: key,
        backend: backend.name,
        entity_type: "knowledge_document",
      })
      .select("id")
      .single();
    if (fError) throw new Error(fError.message);
    fileId = f.id as string;
  } catch (e) {
    if (!(e instanceof StorageUnconfiguredError)) {
      fail("/knowledge/new", `Gagal menyimpan berkas asli: ${e instanceof Error ? e.message : "unknown"}.`);
    }
    // Unconfigured storage: text ingest continues; UI states this honestly.
  }

  let docId: string;
  try {
    docId = await ingestText(supabase, {
      ownerId: userId,
      userId,
      teacherId,
      schoolId,
      title: meta.data.title || file.name,
      text,
      subject: meta.data.subject || null,
      level: meta.data.level || null,
      source: "upload",
      mime: file.type || null,
      size: file.size,
      fileId,
    });
  } catch (e) {
    fail("/knowledge/new", e instanceof Error ? e.message : "Gagal memproses dokumen.");
  }
  track(userId, "document_uploaded", { source: "upload", has_file: Boolean(fileId) });
  redirect(`/knowledge/${docId}`);
}

export async function deleteDocument(documentId: string, formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/knowledge", res.message);
  const { supabase, userId } = res.ctx;
  if (String(formData.get("confirm") ?? "") !== "ya") {
    fail(`/knowledge/${documentId}`, "Centang konfirmasi hapus terlebih dahulu.");
  }
  const { error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", documentId)
    .eq("owner_user_id", userId);
  if (error) fail(`/knowledge/${documentId}`, error.message);
  redirect("/knowledge");
}
