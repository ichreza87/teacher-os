"use server";

import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { questionBankSchema, questionSchema } from "@/modules/teaching/schemas";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createBank(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/questions", res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const parsed = questionBankSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    subject: String(formData.get("subject") ?? "").trim(),
    grade: String(formData.get("grade") ?? "").trim(),
    topic: String(formData.get("topic") ?? "").trim(),
  });
  if (!parsed.success) fail("/questions", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { error } = await supabase.from("question_banks").insert({
    school_id: schoolId,
    teacher_id: teacherId,
    title: d.title,
    subject: d.subject || null,
    grade: d.grade || null,
    topic: d.topic || null,
    created_by: userId,
  });
  if (error) fail("/questions", error.message);
  redirect("/questions");
}

export async function createQuestion(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/questions", res.message);
  const { supabase, userId, schoolId } = res.ctx;

  const parsed = questionSchema.safeParse({
    bankId: String(formData.get("bankId") ?? ""),
    questionType: String(formData.get("questionType") ?? ""),
    difficulty: String(formData.get("difficulty") ?? ""),
    bloomLevel: String(formData.get("bloomLevel") ?? "").trim(),
    subject: String(formData.get("subject") ?? "").trim(),
    grade: String(formData.get("grade") ?? "").trim(),
    topic: String(formData.get("topic") ?? "").trim(),
    content: String(formData.get("content") ?? ""),
    answer: String(formData.get("answer") ?? "").trim(),
    explanation: String(formData.get("explanation") ?? "").trim(),
  });
  if (!parsed.success) fail("/questions", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { data: bank } = await supabase
    .from("question_banks")
    .select("id")
    .eq("id", d.bankId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!bank) fail("/questions", "Bank soal tidak ditemukan.");

  const contentHash = createHash("sha256").update(d.content.trim()).digest("hex");
  const { error } = await supabase.from("questions").insert({
    bank_id: d.bankId,
    school_id: schoolId,
    subject: d.subject || null,
    grade: d.grade || null,
    topic: d.topic || null,
    difficulty: d.difficulty,
    question_type: d.questionType,
    bloom_level: d.bloomLevel || null,
    content: d.content,
    answer: d.answer || null,
    explanation: d.explanation || null,
    content_hash: contentHash,
    created_by: userId,
  });
  if (error) {
    if (error.code === "23505") fail("/questions", "Soal identik sudah ada di bank ini (duplikat terdeteksi).");
    fail("/questions", error.message);
  }
  redirect("/questions");
}
