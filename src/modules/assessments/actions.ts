"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { track } from "@/lib/analytics";
import { assessmentSchema } from "@/modules/teaching/schemas";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createAssessment(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/assessments/new", res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const parsed = assessmentSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    classId: String(formData.get("classId") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    scheduledOn: String(formData.get("scheduledOn") ?? "").trim(),
    maxScore: String(formData.get("maxScore") ?? "100"),
    lessonPlanId: String(formData.get("lessonPlanId") ?? "").trim(),
  });
  if (!parsed.success) fail("/assessments/new", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { data: cls } = await supabase.from("classes").select("id").eq("id", d.classId).eq("school_id", schoolId).maybeSingle();
  if (!cls) fail("/assessments/new", "Kelas tidak ditemukan.");
  if (d.lessonPlanId) {
    const { data: plan } = await supabase.from("lesson_plans").select("id").eq("id", d.lessonPlanId).eq("school_id", schoolId).maybeSingle();
    if (!plan) fail("/assessments/new", "Modul tidak ditemukan.");
  }

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      school_id: schoolId,
      teacher_id: teacherId,
      class_id: d.classId,
      lesson_plan_id: d.lessonPlanId || null,
      title: d.title,
      kind: d.kind,
      scheduled_on: d.scheduledOn || null,
      max_score: d.maxScore,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) fail("/assessments/new", error?.message ?? "Gagal menyimpan asesmen.");
  track(userId, "assessment_created", { kind: d.kind });
  redirect(`/assessments/${data.id}`);
}

/** Bulk score entry from the gradebook form: fields score_<studentId>, feedback_<studentId>. */
export async function saveScores(assessmentId: string, formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(`/assessments/${assessmentId}`, res.message);
  const { supabase, userId, schoolId } = res.ctx;

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, max_score, class_id")
    .eq("id", assessmentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!assessment) fail(`/assessments/${assessmentId}`, "Asesmen tidak ditemukan.");
  const max = Number(assessment.max_score);

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", assessment.class_id)
    .eq("status", "aktif");
  const validIds = new Set((enrollments ?? []).map((e) => e.student_id as string));

  const rows: { assessment_id: string; student_id: string; score: number; feedback: string | null; graded_by: string }[] = [];
  formData.forEach((value, key) => {
    if (!key.startsWith("score_")) return;
    const studentId = key.slice("score_".length);
    if (!validIds.has(studentId)) return;
    const raw = String(value).trim();
    if (raw === "") return; // blank = leave existing value untouched
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > max) {
      fail(`/assessments/${assessmentId}`, `Skor tidak valid (0–${max}).`);
    }
    const feedback = String(formData.get(`feedback_${studentId}`) ?? "").trim();
    rows.push({ assessment_id: assessmentId, student_id: studentId, score, feedback: feedback || null, graded_by: userId });
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("assessment_results")
      .upsert(rows, { onConflict: "assessment_id,student_id" });
    if (error) fail(`/assessments/${assessmentId}`, error.message);
  }
  redirect(`/assessments/${assessmentId}`);
}
