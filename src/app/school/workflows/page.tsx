import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { TRIGGER_LABELS, computeSuggestions, type Trigger } from "@/modules/school/workflows";
import { ContextNote, FormError } from "@/components/ui";
import { markRun, toggleRule } from "@/modules/school/actions";

const ALL_TRIGGERS: Trigger[] = ["lesson_plan_without_assessment", "assessment_fully_graded", "task_overdue"];

export default async function WorkflowsPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Otomatisasi</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId, schoolId } = res.ctx;

  // Ensure default rules exist (all enabled), then load them.
  await supabase.from("workflow_rules").upsert(
    ALL_TRIGGERS.map((trigger) => ({ school_id: schoolId, trigger, enabled: true, created_by: userId })),
    { onConflict: "school_id,trigger", ignoreDuplicates: true }
  );
  const { data: rules } = await supabase.from("workflow_rules").select("id, trigger, enabled").eq("school_id", schoolId);
  const byTrigger = new Map((rules ?? []).map((r) => [r.trigger as Trigger, r]));
  const enabled = ALL_TRIGGERS.filter((t) => byTrigger.get(t)?.enabled !== false);

  // Gather suggestion data (capped queries).
  const [{ data: plans }, { data: assessments }, { data: tasks }, { data: runs }] = await Promise.all([
    supabase.from("lesson_plans").select("id, topic").eq("school_id", schoolId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(20),
    supabase.from("assessments").select("id, title, class_id").eq("school_id", schoolId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(20),
    supabase.from("tasks").select("id, title, due_on").eq("owner_user_id", userId).neq("status", "done").lt("due_on", new Date().toISOString().slice(0, 10)),
    supabase.from("workflow_runs").select("rule_id, entity_type, entity_id, status")
      .in("rule_id", (rules ?? []).map((r) => r.id as string)),
  ]);

  const assessmentPlanIds = new Set(
    (await supabase.from("assessments").select("lesson_plan_id").eq("school_id", schoolId).not("lesson_plan_id", "is", null).limit(200)).data
      ?.map((a) => a.lesson_plan_id as string) ?? []
  );
  const runKeys = new Set((runs ?? []).filter((r) => r.status !== "suggested").map((r) => `${r.rule_id}:${r.entity_type}:${r.entity_id}`));

  const fullyGraded: { id: string; title: string }[] = [];
  for (const a of assessments ?? []) {
    const [{ count: enrolled }, { count: filled }] = await Promise.all([
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("class_id", a.class_id).eq("status", "aktif"),
      supabase.from("assessment_results").select("id", { count: "exact", head: true }).eq("assessment_id", a.id),
    ]);
    if ((enrolled ?? 0) > 0 && enrolled === filled) fullyGraded.push({ id: a.id as string, title: a.title as string });
    if (fullyGraded.length >= 10) break;
  }

  const suggestions = computeSuggestions({
    plansWithoutAssessment: (plans ?? []).filter((p) => !assessmentPlanIds.has(p.id as string)).map((p) => ({ id: p.id as string, topic: p.topic as string })),
    fullyGradedAssessments: fullyGraded,
    overdueTasks: (tasks ?? []).map((t) => ({ id: t.id as string, title: t.title as string, due_on: t.due_on as string })),
    enabled,
  });

  const ruleIdFor = (t: Trigger) => byTrigger.get(t)?.id as string | undefined;
  const visible = suggestions.filter((s) => {
    const rid = ruleIdFor(s.trigger);
    if (!rid) return true;
    return !runKeys.has(`${rid}:${entityOf(s.trigger)}:${s.entityId}`);
  });

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Otomatisasi</h1>
      <p className="mt-1 text-sm text-gray-600">
        Saran otomatis yang bisa Anda atur. Tidak ada yang berjalan tanpa persetujuan — saran hanya berupa tautan kerja.
      </p>
      <FormError message={searchParams.error} />

      <h2 className="mt-6 font-medium">Aturan</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {ALL_TRIGGERS.map((t) => {
          const rule = byTrigger.get(t);
          const on = rule?.enabled !== false;
          return (
            <li key={t} className="flex items-center gap-2 rounded border px-3 py-2">
              <span className="flex-1">{TRIGGER_LABELS[t]} — {on ? "aktif" : "mati"}</span>
              <form action={toggleRule}>
                <input type="hidden" name="trigger" value={t} />
                <input type="hidden" name="enabled" value={on ? "0" : "1"} />
                <button type="submit" className="rounded border px-2 py-1 text-xs">{on ? "Matikan" : "Aktifkan"}</button>
              </form>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-6 font-medium">Saran aktif ({visible.length})</h2>
      {visible.length === 0 ? (
        <p className="mt-1 text-sm text-gray-600">Tidak ada saran saat ini. Kerja bagus.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {visible.map((s) => {
            const rid = ruleIdFor(s.trigger);
            return (
              <li key={`${s.trigger}:${s.entityId}`} className="rounded border px-3 py-2">
                <p className="font-medium">{s.title}</p>
                <p className="text-gray-600">{s.detail}</p>
                <div className="mt-1 flex gap-2">
                  <a href={s.href} className="rounded bg-black px-2 py-1 text-xs text-white">Kerjakan</a>
                  {rid && (
                    <>
                      <form action={markRun.bind(null, rid, entityOf(s.trigger), s.entityId, "applied")}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs">Tandai diterapkan</button>
                      </form>
                      <form action={markRun.bind(null, rid, entityOf(s.trigger), s.entityId, "dismissed")}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs">Abaikan</button>
                      </form>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function entityOf(trigger: Trigger): string {
  return trigger === "lesson_plan_without_assessment" ? "lesson_plan"
    : trigger === "assessment_fully_graded" ? "assessment" : "task";
}
