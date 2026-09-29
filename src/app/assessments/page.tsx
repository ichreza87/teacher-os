import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, PageHeader } from "@/components/ui";

export default async function AssessmentsPage() {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Assessment</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: assessments } = await res.ctx.supabase
    .from("assessments")
    .select("id, title, kind, scheduled_on, max_score, classes(id, name)")
    .eq("school_id", res.ctx.schoolId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <main className="p-8">
      <PageHeader title="Assessment" desc="Asesmen dan nilai siswa." actionHref="/assessments/new" actionLabel="+ Buat Asesmen" />
      {(assessments ?? []).length === 0 ? (
        <EmptyState title="Belum ada asesmen." desc="Buat asesmen pertama untuk kelas Anda."
          actionHref="/assessments/new" actionLabel="+ Buat Asesmen" />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(assessments ?? []).map((a) => (
            <li key={a.id}>
              <Link href={`/assessments/${a.id}`} className="block px-4 py-2 hover:bg-gray-50">
                <span className="font-medium">{a.title}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {[a.kind, (a.classes as unknown as { name: string } | null)?.name, a.scheduled_on ? `jadwal ${a.scheduled_on}` : null].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
