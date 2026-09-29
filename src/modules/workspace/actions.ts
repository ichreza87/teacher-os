"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSchoolContext } from "@/lib/school";
import { buildTeacherContext, type TeacherContextSnapshot } from "@/ai/context/builder";
import { appendMessage, getHistory } from "@/ai/memory/store";
import { retrieve, type RetrievedChunk } from "@/knowledge/retrieval";
import { buildSystemPrompt, wrapUntrusted } from "@/ai/prompts/builder";
import { clarificationQuestion, detectIntent } from "@/ai/actions/router";
import { ACTION_RISK, type ActionType } from "@/ai/actions/schemas";
import { executeAction } from "@/ai/actions/executor";
import { validateProviderOutput } from "@/ai/validators/response";
import { track } from "@/lib/analytics";
import { createProvider, loadProviderSettings } from "@/ai/providers/registry";

type Ctx = { supabase: SupabaseClient; userId: string; teacherId: string; schoolId: string };

async function fullContext(ctx: Ctx): Promise<{ snap: TeacherContextSnapshot; provider: ReturnType<typeof createProvider> }> {
  const snap = await buildTeacherContext(ctx.supabase, ctx.userId, ctx.teacherId, ctx.schoolId);
  const settings = await loadProviderSettings(ctx.supabase, ctx.teacherId);
  return { snap, provider: createProvider(settings) };
}

async function ownConversation(ctx: Ctx, conversationId: string): Promise<boolean> {
  const { data } = await ctx.supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("owner_user_id", ctx.userId)
    .maybeSingle();
  return Boolean(data);
}

/** Core pipeline: intent → (clarify | propose action) → reply. Exported for reuse by the ?ask= flow. */
export async function processUserMessage(ctx: Ctx, conversationId: string, content: string): Promise<void> {
  const { supabase, userId, teacherId } = ctx;
  const { snap, provider } = await fullContext(ctx);
  const system = buildSystemPrompt(snap);
  const history = await getHistory(supabase, conversationId);

  const detected = detectIntent(content, { classes: snap.classes, subject: snap.teacher.subject });

  if (detected.intent === "help") {
    await appendMessage(supabase, conversationId, "assistant",
      "Saya bisa membantu: membuat modul ajar, asesmen/soal, materi, pengingat tugas, dan agenda. " +
      "Saya juga menjawab dari Knowledge Base Anda (upload dulu di menu Knowledge Base). " +
      "Contoh: 'Buatkan soal IPA kelas 5 tentang ekosistem'. Setiap usulan selalu menunggu persetujuan Anda sebelum disimpan.");
    return;
  }
  if (detected.intent === "unsupported") {
    await appendMessage(supabase, conversationId, "assistant",
      "Untuk memakai dokumen: upload PDF/DOCX/TXT/MD/CSV/XLSX di menu Knowledge Base, " +
      "lalu tanyakan isinya di sini atau lewat pencarian semantik. Saya akan menjawab dengan sitasi sumber.");
    return;
  }
  if (detected.intent === "parent_message") {
    await appendMessage(supabase, conversationId, "assistant",
      "Untuk pesan ke orang tua/wali, gunakan menu Communication: pilih template (pengumuman, perkembangan, " +
      "atau pengingat), isi otomatis dari data siswa, lalu setujui draf sebelum dikirim manual. " +
      "Catatan: Teacher OS tidak mengirim pesan otomatis — pengiriman selalu manual oleh Anda. " +
      "Buka: /communication/logs/new");
    return;
  }
  if (detected.intent === "none") {
    // RAG: retrieve relevant knowledge, inject as DATA, cite sources. Retrieval
    // failure (e.g. pgvector not enabled yet) must never break the chat.
    let sources: RetrievedChunk[] = [];
    try {
      sources = await retrieve(supabase, userId, teacherId, content, 4);
    } catch {
      sources = [];
    }
    const kbMessage = sources.length > 0
      ? [{
          role: "user" as const,
          content: wrapUntrusted(
            "pengetahuan-relevan",
            sources.map((s, i) => `[${i + 1}] (${s.title}) ${s.content}`).join("\n\n")
          ),
        }]
      : [];
    try {
      const reply = await provider.chat({
        system,
        messages: [...history, ...kbMessage, { role: "user", content: wrapUntrusted("pesan-guru", content) }],
      });
      let text = reply.text;
      if (sources.length > 0) {
        const titles = Array.from(new Set(sources.map((s) => s.title)));
        text += `\n\nSumber pengetahuan: ${titles.join("; ")}`;
      }
      await appendMessage(supabase, conversationId, "assistant", text);
    } catch (e) {
      await appendMessage(supabase, conversationId, "assistant",
        `Maaf, provider AI gagal: ${e instanceof Error ? e.message : "error tidak dikenal"}. Periksa AI Settings atau gunakan Mock.`);
    }
    return;
  }

  if (detected.missing.length > 0) {
    await appendMessage(supabase, conversationId, "assistant", clarificationQuestion(detected, snap.classes));
    return;
  }

  // Slots complete → ask provider to shape the payload, then validate strictly.
  try {
    const raw = await provider.generateStructured({
      system,
      instruction: `Bentuk payload JSON untuk aksi "${detected.intent}". Kembalikan objek {"type": "${detected.intent}", "payload": {...}}.`,
      data: { type: detected.intent, payload: detected.slots },
    });
    const v = validateProviderOutput(raw);
    if (!v.ok) {
      await appendMessage(supabase, conversationId, "assistant", `Usulan aksi tidak valid (${v.error}). Coba ulangi dengan detail berbeda.`);
      return;
    }
    const type = v.type as ActionType;
    const { error } = await supabase.from("ai_actions").insert({
      conversation_id: conversationId,
      type,
      payload: v.payload,
      risk: ACTION_RISK[type],
      status: "proposed",
    });
    if (error) throw new Error(error.message);
    await appendMessage(supabase, conversationId, "assistant",
      `Saya mengusulkan: ${actionLabel(type)}. Periksa pratinjau di bawah — Setujui untuk menyimpan, atau Tolak.`);
  } catch (e) {
    await appendMessage(supabase, conversationId, "assistant",
      `Gagal menyusun usulan: ${e instanceof Error ? e.message : "error tidak dikenal"}.`);
  }
  void userId;
}

function actionLabel(type: ActionType): string {
  return {
    create_lesson_plan: "membuat modul ajar",
    create_assessment: "membuat asesmen",
    create_material: "membuat materi",
    create_task: "membuat pengingat tugas",
    create_event: "membuat agenda",
  }[type];
}

export async function createConversation(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) redirect(`/workspace?error=${encodeURIComponent(res.message)}`);
  const { supabase, userId } = res.ctx;
  const first = String(formData.get("firstMessage") ?? "").trim();

  const { data: conv, error } = await supabase
    .from("ai_conversations")
    .insert({ owner_user_id: userId, title: first ? first.slice(0, 60) : "Percakapan baru" })
    .select("id")
    .single();
  if (error || !conv) redirect(`/workspace?error=${encodeURIComponent(error?.message ?? "Gagal membuat percakapan.")}`);
  const id = conv.id as string;
  if (first) {
    await appendMessage(supabase, id, "user", first);
    await processUserMessage(res.ctx, id, first);
  }
  redirect(`/workspace/${id}`);
}

export async function sendMessage(conversationId: string, formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) redirect(`/workspace/${conversationId}?error=${encodeURIComponent(res.message)}`);
  if (!(await ownConversation(res.ctx, conversationId))) redirect("/workspace?error=Akses ditolak.");
  const content = String(formData.get("content") ?? "").trim();
  if (!content) redirect(`/workspace/${conversationId}`);
  await appendMessage(res.ctx.supabase, conversationId, "user", content);
  await processUserMessage(res.ctx, conversationId, content);
  redirect(`/workspace/${conversationId}`);
}

export async function confirmAction(actionId: string): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) redirect(`/workspace?error=${encodeURIComponent(res.message)}`);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const { data: action } = await supabase
    .from("ai_actions")
    .select("id, conversation_id, type, payload, status, ai_conversations!inner(owner_user_id)")
    .eq("id", actionId)
    .maybeSingle();
  const owner = (action?.ai_conversations as unknown as { owner_user_id: string } | null)?.owner_user_id;
  if (!action || owner !== userId || action.status !== "proposed") redirect("/workspace?error=Aksi tidak valid.");
  const conversationId = action.conversation_id as string;

  try {
    const result = await executeAction(
      supabase, { userId, teacherId, schoolId },
      action.type as string, action.payload
    );
    await supabase.from("ai_actions").update({ status: "executed", result }).eq("id", actionId);
    track(userId, "ai_action_executed", { action_type: action.type as string });
    await appendMessage(supabase, conversationId, "assistant", `Selesai: ${result.entityLabel} tersimpan.`);
  } catch (e) {
    await appendMessage(supabase, conversationId, "assistant",
      `Eksekusi gagal: ${e instanceof Error ? e.message : "error tidak dikenal"}. Tidak ada data yang berubah.`);
  }
  redirect(`/workspace/${conversationId}`);
}

export async function rejectAction(actionId: string): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) redirect("/workspace?error=Akses ditolak.");
  const { supabase, userId } = res.ctx;
  const { data: action } = await supabase
    .from("ai_actions")
    .select("id, conversation_id, status, ai_conversations!inner(owner_user_id)")
    .eq("id", actionId)
    .maybeSingle();
  const owner = (action?.ai_conversations as unknown as { owner_user_id: string } | null)?.owner_user_id;
  if (!action || owner !== userId) redirect("/workspace?error=Akses ditolak.");
  await supabase.from("ai_actions").update({ status: "rejected" }).eq("id", actionId);
  await appendMessage(supabase, action.conversation_id as string, "assistant", "Baik, usulan dibatalkan.");
  redirect(`/workspace/${action.conversation_id}`);
}

export async function saveAsMaterial(messageId: string): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) redirect("/workspace?error=Akses ditolak.");
  const { supabase, userId, teacherId, schoolId } = res.ctx;
  const { data: msg } = await supabase
    .from("ai_messages")
    .select("id, role, content, conversation_id, ai_conversations!inner(owner_user_id)")
    .eq("id", messageId)
    .maybeSingle();
  const owner = (msg?.ai_conversations as unknown as { owner_user_id: string } | null)?.owner_user_id;
  if (!msg || owner !== userId || msg.role !== "assistant") redirect("/workspace?error=Pesan tidak valid.");
  const content = msg.content as string;
  const { error } = await supabase.from("materials").insert({
    school_id: schoolId, teacher_id: teacherId,
    title: content.slice(0, 60) || "Catatan AI",
    kind: "dokumen", body: content, created_by: userId,
  });
  if (error) redirect(`/workspace/${msg.conversation_id}?error=${encodeURIComponent(error.message)}`);
  redirect("/materials");
}
