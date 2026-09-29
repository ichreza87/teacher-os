import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ASSESSMENT_KINDS } from "@/modules/teaching/schemas";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { createAssessment } from "@/modules/assessments/actions";

export default async function NewAssessmentPage({ searchParams }: { searchParams: { error?: string; plan?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Buat Asesmen</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const [{ data: classes }, { data: plans }] = await Promise.all([
    res.ctx.supabase.from("classes").select("id, name").eq("school_id", res.ctx.schoolId).is("deleted_at", null).order("name"),
    res.ctx.supabase.from("lesson_plans").select("id, topic").eq("school_id", res.ctx.schoolId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(100),
  ]);

  return (
    <main className="max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Buat Asesmen</h1>
      <form action={createAssessment} className="mt-4 space-y-3">
        <FormError message={searchParams.error} />
        <Field label="Judul" htmlFor="title">
          <input id="title" name="title" required placeholder="cth. Sumatif Ekosistem" className={inputCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kelas" htmlFor="classId">
            <select id="classId" name="classId" required className={inputCls} defaultValue="">
              <option value="">Pilih kelas</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Jenis" htmlFor="kind">
            <select id="kind" name="kind" className={inputCls} defaultValue="formatif">
              {ASSESSMENT_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jadwal (opsional)" htmlFor="scheduledOn">
            <input id="scheduledOn" name="scheduledOn" type="date" className={inputCls} />
          </Field>
          <Field label="Skor maksimal" htmlFor="maxScore">
            <input id="maxScore" name="maxScore" type="number" min={1} defaultValue={100} className={inputCls} />
          </Field>
        </div>
        <Field label="Modul terkait (opsional)" htmlFor="lessonPlanId">
          <select id="lessonPlanId" name="lessonPlanId" className={inputCls} defaultValue={searchParams.plan ?? ""}>
            <option value="">-</option>
            {(plans ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.topic}</option>
            ))}
          </select>
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">Simpan Asesmen</button>
      </form>
    </main>
  );
}
