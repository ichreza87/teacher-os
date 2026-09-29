import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, PageHeader, inputCls } from "@/components/ui";
import { createSchoolDocument } from "@/modules/school/actions";

const KINDS = ["policy", "meeting", "inventory", "announcement", "other"] as const;

export default async function SchoolPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">School</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: docs } = await res.ctx.supabase
    .from("school_documents")
    .select("id, title, kind, body, event_date, created_at")
    .eq("school_id", res.ctx.schoolId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-3xl p-8">
      <PageHeader title="School" desc="Kebijakan, notulen rapat, inventaris, pengumuman sekolah."
        actionHref="/school/workflows" actionLabel="Otomatisasi" />
      <form action={createSchoolDocument} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Tambah dokumen sekolah</p>
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
        <Field label="Tanggal terkait (opsional)" htmlFor="eventDate">
          <input id="eventDate" name="eventDate" type="date" className={inputCls} />
        </Field>
        <Field label="Isi" htmlFor="body">
          <textarea id="body" name="body" rows={4} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Simpan</button>
      </form>

      <div className="mt-6 space-y-2 text-sm">
        {(docs ?? []).length === 0 && <p className="text-gray-600">Belum ada dokumen sekolah.</p>}
        {(docs ?? []).map((d) => (
          <div key={d.id} className="rounded border px-3 py-2">
            <p className="font-medium">{d.title} <span className="font-normal text-gray-500">({d.kind}{d.event_date ? ` · ${d.event_date}` : ""})</span></p>
            {d.body ? <p className="mt-1 whitespace-pre-wrap text-gray-700">{d.body}</p> : null}
          </div>
        ))}
      </div>
    </main>
  );
}
