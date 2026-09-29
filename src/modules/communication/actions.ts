"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSchoolContext } from "@/lib/school";
import { canTransition, type LogStatus } from "@/modules/communication/helpers";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const TEMPLATE_KINDS = ["announcement", "progress", "feedback", "reminder", "other"] as const;
const CHANNELS = ["whatsapp_manual", "email_manual", "other_manual"] as const;

const templateSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  kind: z.enum(TEMPLATE_KINDS),
  body: z.string().trim().min(4, "Isi template minimal 4 karakter"),
});

const draftSchema = z.object({
  studentId: z.string().uuid("Siswa tidak valid").optional().or(z.literal("")),
  templateId: z.string().uuid("Template tidak valid").optional().or(z.literal("")),
  recipientName: z.string().trim().optional().or(z.literal("")),
  recipientContact: z.string().trim().optional().or(z.literal("")),
  channel: z.enum(CHANNELS),
  subject: z.string().trim().optional().or(z.literal("")),
  body: z.string().trim().min(4, "Isi pesan minimal 4 karakter"),
});

export async function createTemplate(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/communication/templates", res.message);
  const { supabase, userId, schoolId } = res.ctx;
  const parsed = templateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) fail("/communication/templates", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const { error } = await supabase.from("communication_templates").insert({
    school_id: schoolId,
    title: parsed.data.title,
    kind: parsed.data.kind,
    body: parsed.data.body,
    created_by: userId,
  });
  if (error) fail("/communication/templates", error.message);
  redirect("/communication/templates");
}

export async function createDraft(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/communication/logs/new", res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;
  const parsed = draftSchema.safeParse({
    studentId: String(formData.get("studentId") ?? "").trim(),
    templateId: String(formData.get("templateId") ?? "").trim(),
    recipientName: String(formData.get("recipientName") ?? "").trim(),
    recipientContact: String(formData.get("recipientContact") ?? "").trim(),
    channel: String(formData.get("channel") ?? ""),
    subject: String(formData.get("subject") ?? "").trim(),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) fail("/communication/logs/new", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  if (d.studentId) {
    const { data: s } = await supabase.from("students").select("id").eq("id", d.studentId).eq("school_id", schoolId).maybeSingle();
    if (!s) fail("/communication/logs/new", "Siswa tidak ditemukan.");
  }
  if (d.templateId) {
    const { data: t } = await supabase.from("communication_templates").select("id").eq("id", d.templateId).eq("school_id", schoolId).maybeSingle();
    if (!t) fail("/communication/logs/new", "Template tidak ditemukan.");
  }

  const { error } = await supabase.from("communication_logs").insert({
    school_id: schoolId,
    teacher_id: teacherId,
    student_id: d.studentId || null,
    template_id: d.templateId || null,
    channel: d.channel,
    recipient_name: d.recipientName || null,
    recipient_contact: d.recipientContact || null,
    subject: d.subject || null,
    body: d.body,
    status: "draft",
    created_by: userId,
  });
  if (error) fail("/communication/logs/new", error.message);
  redirect("/communication/logs");
}

export async function setLogStatus(logId: string, to: LogStatus): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/communication/logs", res.message);
  const { supabase, userId, schoolId } = res.ctx;
  const { data: log } = await supabase
    .from("communication_logs")
    .select("id, status")
    .eq("id", logId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!log) fail("/communication/logs", "Pesan tidak ditemukan.");
  if (!canTransition(log.status as LogStatus, to)) {
    fail("/communication/logs", `Transisi ${log.status} → ${to} tidak diizinkan.`);
  }
  const patch: Record<string, unknown> =
    to === "approved" ? { status: to, approved_by: userId } :
    to === "sent" ? { status: to, sent_at: new Date().toISOString() } :
    { status: to };
  const { error } = await supabase.from("communication_logs").update(patch).eq("id", logId);
  if (error) fail("/communication/logs", error.message);
  await supabase.from("audit_logs").insert({
    actor_id: userId, action: `message_${to}`, entity_type: "communication_log", entity_id: logId,
  });
  redirect("/communication/logs");
}
