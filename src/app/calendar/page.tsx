import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { EVENT_KINDS } from "@/modules/teaching/schemas";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { createEvent } from "@/modules/calendar/actions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default async function CalendarPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Calendar</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const [{ data: events }, { data: classes }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, description, starts_at, ends_at, kind, classes(id, name)")
      .eq("school_id", schoolId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
    supabase.from("classes").select("id, name").eq("school_id", schoolId).is("deleted_at", null).order("name"),
  ]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="mt-1 text-sm text-gray-600">Agenda akademik dan kegiatan mendatang.</p>
      <FormError message={searchParams.error} />

      <form action={createEvent} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Tambah agenda</p>
        <Field label="Judul" htmlFor="title">
          <input id="title" name="title" required className={inputCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai" htmlFor="startsAt">
            <input id="startsAt" name="startsAt" type="datetime-local" required className={inputCls} />
          </Field>
          <Field label="Selesai (opsional)" htmlFor="endsAt">
            <input id="endsAt" name="endsAt" type="datetime-local" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jenis" htmlFor="kind">
            <select id="kind" name="kind" className={inputCls} defaultValue="akademik">
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Kelas (opsional)" htmlFor="classId">
            <select id="classId" name="classId" className={inputCls} defaultValue="">
              <option value="">-</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Deskripsi (opsional)" htmlFor="description">
          <textarea id="description" name="description" rows={2} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Tambah Agenda</button>
      </form>

      <div className="mt-6 max-w-3xl">
        <p className="font-medium">Mendatang</p>
        {(events ?? []).length === 0 ? (
          <p className="mt-1 rounded border p-4 text-center text-sm text-gray-600">Belum ada agenda mendatang.</p>
        ) : (
          <ul className="mt-2 divide-y rounded border text-sm">
            {(events ?? []).map((e) => (
              <li key={e.id} className="px-4 py-2">
                <span className="font-medium">{e.title}</span>
                <span className="ml-2 text-gray-500">
                  {[fmt(e.starts_at), e.ends_at ? `s.d. ${fmt(e.ends_at)}` : null, e.kind,
                    (e.classes as unknown as { name: string } | null)?.name].filter(Boolean).join(" · ")}
                </span>
                {e.description && <p className="text-gray-600">{e.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
