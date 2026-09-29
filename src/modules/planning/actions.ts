"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { lessonPlanSchema } from "@/modules/teaching/schemas";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createLessonPlan(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/planning/new", res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const parsed = lessonPlanSchema.safeParse({
    subject: String(formData.get("subject") ?? ""),
    grade: String(formData.get("grade") ?? "").trim(),
    topic: String(formData.get("topic") ?? ""),
    objectives: String(formData.get("objectives") ?? "").trim(),
    activities: String(formData.get("activities") ?? "").trim(),
    durationMeetings: String(formData.get("durationMeetings") ?? "1"),
    classId: String(formData.get("classId") ?? "").trim(),
    status: String(formData.get("status") ?? "draft"),
  });
  if (!parsed.success) fail("/planning/new", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  if (d.classId) {
    const { data: cls } = await supabase.from("classes").select("id").eq("id", d.classId).eq("school_id", schoolId).maybeSingle();
    if (!cls) fail("/planning/new", "Kelas tidak ditemukan.");
  }

  const { data, error } = await supabase
    .from("lesson_plans")
    .insert({
      school_id: schoolId,
      teacher_id: teacherId,
      class_id: d.classId || null,
      subject: d.subject,
      grade: d.grade || null,
      topic: d.topic,
      objectives: d.objectives || null,
      activities: d.activities || null,
      duration_meetings: d.durationMeetings,
      status: d.status,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) fail("/planning/new", error?.message ?? "Gagal menyimpan modul.");
  redirect(`/planning/${data.id}`);
}
