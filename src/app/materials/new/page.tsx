import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { MATERIAL_KINDS } from "@/modules/teaching/schemas";
import { createMaterial } from "@/modules/materials/actions";

export default async function NewMaterialPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Tambah Materi</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: plans } = await res.ctx.supabase
    .from("lesson_plans")
    .select("id, topic")
    .eq("school_id", res.ctx.schoolId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Tambah Materi</h1>
      <form action={createMaterial} className="mt-4 space-y-3">
        <FormError message={searchParams.error} />
        <Field label="Judul" htmlFor="title">
          <input id="title" name="title" required className={inputCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis" htmlFor="kind">
            <select id="kind" name="kind" className={inputCls} defaultValue="dokumen">
              {MATERIAL_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Modul terkait (opsional)" htmlFor="lessonPlanId">
            <select id="lessonPlanId" name="lessonPlanId" className={inputCls} defaultValue="">
              <option value="">-</option>
              {(plans ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.topic}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Mapel" htmlFor="subject">
            <input id="subject" name="subject" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Tingkat" htmlFor="grade">
            <input id="grade" name="grade" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Topik" htmlFor="topic">
            <input id="topic" name="topic" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <Field label="URL (opsional)" htmlFor="url" hint="Untuk video, tautan, atau dokumen online.">
          <input id="url" name="url" type="url" className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Isi / catatan (opsional)" htmlFor="body">
          <textarea id="body" name="body" rows={4} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">Simpan Materi</button>
      </form>
    </main>
  );
}
