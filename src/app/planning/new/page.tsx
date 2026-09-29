import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { createLessonPlan } from "@/modules/planning/actions";

export default async function NewPlanPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Buat Modul</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: classes } = await res.ctx.supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", res.ctx.schoolId)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Buat Modul Ajar</h1>
      <form action={createLessonPlan} className="mt-4 space-y-3">
        <FormError message={searchParams.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mata pelajaran" htmlFor="subject">
            <input id="subject" name="subject" required className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Tingkat" htmlFor="grade">
            <input id="grade" name="grade" placeholder="cth. 5" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <Field label="Topik" htmlFor="topic">
          <input id="topic" name="topic" required placeholder="cth. Ekosistem" className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Kelas (opsional)" htmlFor="classId">
          <select id="classId" name="classId" className={inputCls} defaultValue="">
            <option value="">-</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Tujuan pembelajaran" htmlFor="objectives">
          <textarea id="objectives" name="objectives" rows={3} className={inputCls} />
        </Field>
        <Field label="Aktivitas pembelajaran" htmlFor="activities">
          <textarea id="activities" name="activities" rows={3} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah pertemuan" htmlFor="durationMeetings">
            <input id="durationMeetings" name="durationMeetings" type="number" min={1} max={32} defaultValue={1} className={inputCls} />
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" className={inputCls} defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">Simpan Modul</button>
      </form>
    </main>
  );
}
