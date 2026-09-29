import type { SupabaseClient } from "@supabase/supabase-js";
import { getLevelConfig } from "@/config/levels";
import type { LevelConfig } from "@/config/levels";

/** Minimal, minimized context snapshot passed to the AI.
 *  Aggregates only — never full student PII or whole tables. */
export interface TeacherContextSnapshot {
  teacher: { subject: string | null; role: string; level: string | null };
  school: { name: string };
  counts: {
    classes: number;
    students: number;
    plans: number;
    materials: number;
    banks: number;
    questions: number;
    assessments: number;
    openTasks: number;
  };
  classes: { id: string; name: string }[];
  /** Assessments with partial score entry (filled/total). Capped at 5. */
  pendingAssessments: { id: string; title: string; filled: number; total: number }[];
  levelConfig: LevelConfig | null;
  generatedAt: string;
}

export async function buildTeacherContext(
  supabase: SupabaseClient,
  userId: string,
  teacherId: string,
  schoolId: string
): Promise<TeacherContextSnapshot> {
  const [{ data: teacher }, { data: school }] = await Promise.all([
    supabase.from("teachers").select("subject, role, education_level_code").eq("id", teacherId).maybeSingle(),
    supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
  ]);

  const [
    { count: classCount },
    { count: studentCount },
    { count: planCount },
    { count: materialCount },
    { count: bankCount },
    { count: questionCount },
    { count: assessmentCount },
    { count: openTaskCount },
    { data: classes },
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("lesson_plans").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("question_banks").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("owner_user_id", userId).neq("status", "done"),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).is("deleted_at", null).order("name").limit(50),
  ]);

  // Pending assessments: those whose filled results < enrolled students. Cap 5.
  const { data: recent } = await supabase
    .from("assessments")
    .select("id, title, class_id")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(10);

  const pendingAssessments: TeacherContextSnapshot["pendingAssessments"] = [];
  for (const a of recent ?? []) {
    const [{ count: enrolled }, { count: filled }] = await Promise.all([
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("class_id", a.class_id).eq("status", "aktif"),
      supabase.from("assessment_results").select("id", { count: "exact", head: true }).eq("assessment_id", a.id),
    ]);
    if ((enrolled ?? 0) > (filled ?? 0)) {
      pendingAssessments.push({ id: a.id as string, title: a.title as string, filled: filled ?? 0, total: enrolled ?? 0 });
    }
    if (pendingAssessments.length >= 5) break;
  }

  let levelConfig: LevelConfig | null = null;
  try {
    if (teacher?.education_level_code) levelConfig = getLevelConfig(teacher.education_level_code as string);
  } catch {
    levelConfig = null;
  }

  return {
    teacher: {
      subject: (teacher?.subject as string | null) ?? null,
      role: (teacher?.role as string) ?? "guru_mapel",
      level: (teacher?.education_level_code as string | null) ?? null,
    },
    school: { name: (school?.name as string) ?? "-" },
    counts: {
      classes: classCount ?? 0,
      students: studentCount ?? 0,
      plans: planCount ?? 0,
      materials: materialCount ?? 0,
      banks: bankCount ?? 0,
      questions: questionCount ?? 0,
      assessments: assessmentCount ?? 0,
      openTasks: openTaskCount ?? 0,
    },
    classes: (classes ?? []).map((c) => ({ id: c.id as string, name: c.name as string })),
    pendingAssessments,
    levelConfig,
    generatedAt: new Date().toISOString(),
  };
}
