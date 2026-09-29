import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, PageHeader } from "@/components/ui";

export default async function PlanningPage() {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Planning</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: plans } = await res.ctx.supabase
    .from("lesson_plans")
    .select("id, subject, grade, topic, status, duration_meetings, updated_at")
    .eq("school_id", res.ctx.schoolId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <main className="p-8">
      <PageHeader title="Planning" desc="Modul ajar dan rencana pembelajaran." actionHref="/planning/new" actionLabel="+ Buat Modul" />
      {(plans ?? []).length === 0 ? (
        <EmptyState title="Belum ada lesson plan." desc="Buat modul ajar pertama Anda."
          actionHref="/planning/new" actionLabel="+ Buat Lesson Plan" />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(plans ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/planning/${p.id}`} className="block px-4 py-2 hover:bg-gray-50">
                <span className="font-medium">{p.topic}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {[p.subject, p.grade ? `tingkat ${p.grade}` : null, `${p.duration_meetings} pertemuan`, p.status].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
