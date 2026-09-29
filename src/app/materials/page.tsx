import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, PageHeader } from "@/components/ui";

export default async function MaterialsPage({ searchParams }: { searchParams: { q?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Materials</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("materials")
    .select("id, title, kind, subject, grade, topic, updated_at")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data: materials } = await query;

  return (
    <main className="p-8">
      <PageHeader title="Materials" desc="Materi pembelajaran." actionHref="/materials/new" actionLabel="+ Tambah Materi" />
      <form method="get" className="mt-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Cari materi..." aria-label="Cari materi"
          className="w-full rounded border px-3 py-2" />
        <button type="submit" className="rounded border px-4 py-2">Cari</button>
      </form>
      {(materials ?? []).length === 0 ? (
        <EmptyState title="Belum ada materi." desc="Tambahkan materi pertama Anda."
          actionHref="/materials/new" actionLabel="+ Tambah Materi" />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(materials ?? []).map((m) => (
            <li key={m.id} className="px-4 py-2">
              <span className="font-medium">{m.title}</span>
              <span className="ml-2 text-sm text-gray-500">
                {[m.kind, m.subject, m.grade ? `tingkat ${m.grade}` : null, m.topic].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
