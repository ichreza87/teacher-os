import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, PageHeader, inputCls } from "@/components/ui";
import { createPD } from "@/modules/professional/actions";

const KINDS = ["course", "training", "certification", "workshop", "reading", "achievement"] as const;

export default async function ProfessionalPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Professional</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: items } = await res.ctx.supabase
    .from("professional_development")
    .select("id, kind, title, provider, held_on, hours")
    .eq("teacher_id", res.ctx.teacherId)
    .order("held_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-3xl p-8">
      <PageHeader title="Professional" desc="Pengembangan diri: kursus, pelatihan, sertifikasi, bacaan, pencapaian."
        actionHref="/professional/portfolio" actionLabel="Lihat Portfolio" />
      <form action={createPD} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Catat kegiatan</p>
        <FormError message={searchParams.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis" htmlFor="kind">
            <select id="kind" name="kind" className={inputCls} defaultValue="course">
              {KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Judul" htmlFor="title">
            <input id="title" name="title" required className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Penyelenggara" htmlFor="provider">
            <input id="provider" name="provider" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Tanggal" htmlFor="heldOn">
            <input id="heldOn" name="heldOn" type="date" className={inputCls} />
          </Field>
          <Field label="Jam" htmlFor="hours">
            <input id="hours" name="hours" type="number" min={0} step="any" className={inputCls} />
          </Field>
        </div>
        <Field label="Catatan/refleksi" htmlFor="notes">
          <textarea id="notes" name="notes" rows={3} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Simpan</button>
      </form>

      <div className="mt-6 space-y-2 text-sm">
        {(items ?? []).length === 0 && <p className="text-gray-600">Belum ada catatan pengembangan diri.</p>}
        {(items ?? []).map((i) => (
          <div key={i.id} className="rounded border px-3 py-2">
            <p className="font-medium">{i.title} <span className="font-normal text-gray-500">({i.kind})</span></p>
            <p className="text-gray-600">
              {[i.provider, i.held_on, i.hours != null ? `${i.hours} jam` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm"><Link href="/professional/portfolio" className="underline">Buka portfolio →</Link></p>
    </main>
  );
}
