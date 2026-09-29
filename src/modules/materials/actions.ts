"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { materialSchema } from "@/modules/teaching/schemas";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createMaterial(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/materials/new", res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const parsed = materialSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? "dokumen"),
    subject: String(formData.get("subject") ?? "").trim(),
    grade: String(formData.get("grade") ?? "").trim(),
    topic: String(formData.get("topic") ?? "").trim(),
    lessonPlanId: String(formData.get("lessonPlanId") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim(),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) fail("/materials/new", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  if (d.lessonPlanId) {
    const { data: plan } = await supabase.from("lesson_plans").select("id").eq("id", d.lessonPlanId).eq("school_id", schoolId).maybeSingle();
    if (!plan) fail("/materials/new", "Modul tidak ditemukan.");
  }

  const { error } = await supabase.from("materials").insert({
    school_id: schoolId,
    lesson_plan_id: d.lessonPlanId || null,
    teacher_id: teacherId,
    title: d.title,
    kind: d.kind,
    url: d.url || null,
    body: d.body || null,
    subject: d.subject || null,
    grade: d.grade || null,
    topic: d.topic || null,
    created_by: userId,
  });
  if (error) fail("/materials/new", error.message);
  redirect("/materials");
}
