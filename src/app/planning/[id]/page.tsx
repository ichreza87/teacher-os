import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote } from "@/components/ui";

export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Detail Modul</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const { data: plan } = await supabase
    .from("lesson_plans")
    .select("id, subject, grade, topic, objectives, activities, duration_meetings, status, classes(id, name)")
    .eq("id", params.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!plan) notFound();

  const [{ data: materials }, { data: assessments }] = await Promise.all([
    supabase.from("materials").select("id, title, kind").eq("lesson_plan_id", params.id).is("deleted_at", null),
    supabase.from("assessments").select("id, title, kind").eq("lesson_plan_id", params.id).is("deleted_at", null),
  ]);

  return (
    <main className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{plan.topic}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {[plan.subject, plan.grade ? `tingkat ${plan.grade}` : null, `${plan.duration_meetings} pertemuan`, plan.status].filter(Boolean).join(" · ")}
      </p>
      {(plan.classes as unknown as { name: string } | null)?.name && (
        <p className="mt-1 text-sm">Kelas: {(plan.classes as unknown as { name: string }).name}</p>
      )}
      <div className="mt-4 rounded border p-4">
        <p className="font-medium">Tujuan pembelajaran</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{plan.objectives || "-"}</p>
      </div>
      <div className="mt-3 rounded border p-4">
        <p className="font-medium">Aktivitas pembelajaran</p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{plan.activities || "-"}</p>
      </div>

      <h2 className="mt-6 font-medium">Materi terkait</h2>
      {(materials ?? []).length === 0 ? (
        <p className="mt-1 text-sm text-gray-600">Belum ada materi untuk modul ini.</p>
      ) : (
        <ul className="mt-1 divide-y rounded border text-sm">
          {(materials ?? []).map((m) => (
            <li key={m.id} className="px-3 py-1">{m.title} <span className="text-gray-500">({m.kind})</span></li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 font-medium">Asesmen terkait</h2>
      {(assessments ?? []).length === 0 ? (
        <p className="mt-1 text-sm text-gray-600">Belum ada asesmen untuk modul ini.</p>
      ) : (
        <ul className="mt-1 divide-y rounded border text-sm">
          {(assessments ?? []).map((a) => (
            <li key={a.id} className="px-3 py-1">
              <Link href={`/assessments/${a.id}`} className="underline">{a.title}</Link>
              <span className="text-gray-500"> ({a.kind})</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
