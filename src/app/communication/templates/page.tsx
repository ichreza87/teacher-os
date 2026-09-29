import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { createTemplate } from "@/modules/communication/actions";

const KINDS = ["announcement", "progress", "feedback", "reminder", "other"] as const;

export default async function TemplatesPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Template Pesan</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: templates } = await res.ctx.supabase
    .from("communication_templates")
    .select("id, title, kind, body")
    .eq("school_id", res.ctx.schoolId)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Template Pesan</h1>
      <p className="mt-1 text-sm text-gray-600">
        Placeholder: {"{{nama_siswa}} {{nama_guru}} {{kelas}} {{sekolah}} {{tanggal}}"}
      </p>

      <form action={createTemplate} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Buat template</p>
        <FormError message={searchParams.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Judul" htmlFor="title">
            <input id="title" name="title" required className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Jenis" htmlFor="kind">
            <select id="kind" name="kind" className={inputCls} defaultValue="announcement">
              {KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Isi" htmlFor="body">
          <textarea id="body" name="body" required rows={4} className={inputCls}
            placeholder="Yth. orang tua/wali {{nama_siswa}} kelas {{kelas}}, ..." />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Simpan Template</button>
      </form>

      <div className="mt-6 space-y-2 text-sm">
        {(templates ?? []).length === 0 && <p className="text-gray-600">Belum ada template.</p>}
        {(templates ?? []).map((t) => (
          <div key={t.id} className="rounded border px-3 py-2">
            <p className="font-medium">{t.title} <span className="font-normal text-gray-500">({t.kind})</span></p>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{t.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
