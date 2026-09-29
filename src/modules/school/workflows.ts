/** Workflow automation: pure suggestion computation. Data fetching stays in pages. */

export type Trigger = "lesson_plan_without_assessment" | "assessment_fully_graded" | "task_overdue";

export interface Suggestion {
  trigger: Trigger;
  entityId: string;
  title: string;
  detail: string;
  href: string;
}

export const TRIGGER_LABELS: Record<Trigger, string> = {
  lesson_plan_without_assessment: "Modul tanpa asesmen",
  assessment_fully_graded: "Asesmen selesai dinilai",
  task_overdue: "Tugas terlambat",
};

export interface WorkflowInput {
  plansWithoutAssessment: { id: string; topic: string }[];
  fullyGradedAssessments: { id: string; title: string }[];
  overdueTasks: { id: string; title: string; due_on: string }[];
  enabled: Trigger[];
}

export function computeSuggestions(input: WorkflowInput): Suggestion[] {
  const out: Suggestion[] = [];
  if (input.enabled.includes("lesson_plan_without_assessment")) {
    for (const p of input.plansWithoutAssessment.slice(0, 5)) {
      out.push({
        trigger: "lesson_plan_without_assessment",
        entityId: p.id,
        title: `Modul "${p.topic}" belum punya asesmen`,
        detail: "Buat asesmen terkait agar loop Plan → Assess lengkap.",
        href: `/assessments/new?plan=${p.id}`,
      });
    }
  }
  if (input.enabled.includes("assessment_fully_graded")) {
    for (const a of input.fullyGradedAssessments.slice(0, 5)) {
      out.push({
        title: `Asesmen "${a.title}" sudah lengkap dinilai`,
        detail: "Tinjau rata-rata dan tentukan remedial/pengayaan.",
        href: `/assessments/${a.id}`,
        trigger: "assessment_fully_graded",
        entityId: a.id,
      });
    }
  }
  if (input.enabled.includes("task_overdue")) {
    for (const t of input.overdueTasks.slice(0, 5)) {
      out.push({
        title: `Tugas "${t.title}" terlambat (jatuh tempo ${t.due_on})`,
        detail: "Selesaikan atau jadwalk ulang di Tasks.",
        href: "/tasks",
        trigger: "task_overdue",
        entityId: t.id,
      });
    }
  }
  return out;
}
