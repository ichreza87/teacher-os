import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote } from "@/components/ui";

export default async function PortfolioPage() {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Portfolio</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const [{ data: profile }, { data: teacher }, { data: school }, { data: pd }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("teachers").select("subject, role, education_level_code, bio").eq("id", teacherId).maybeSingle(),
    supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
    supabase.from("professional_development").select("kind, title, provider, held_on, hours, notes").eq("teacher_id", teacherId).order("held_on", { ascending: false, nullsFirst: false }).limit(100),
  ]);
  const counts = await Promise.all([
    supabase.from("lesson_plans").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("owner_user_id", userId),
  ]);
  const [plans, materials, assessments, docs] = counts.map((c) => c.count ?? 0);
  const hours = (pd ?? []).reduce((s, p) => s + (Number(p.hours) || 0), 0);

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{(profile?.full_name as string) ?? "Portfolio Guru"}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {[(teacher?.role as string) ?? "-", (teacher?.subject as string) ?? "-", (teacher?.education_level_code as string) ?? "-", (school?.name as string) ?? "-"].join(" · ")}
      </p>
      {teacher?.bio ? <p className="mt-2 text-sm">{teacher.bio as string}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Modul", plans],
          ["Materi", materials],
          ["Asesmen", assessments],
          ["Dokumen", docs],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded border p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-semibold">{n}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-6 font-medium">Pengembangan diri ({(pd ?? []).length} kegiatan · {hours} jam)</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {(pd ?? []).length === 0 && <li className="text-gray-600">Belum ada kegiatan.</li>}
        {(pd ?? []).map((p, i) => (
          <li key={i} className="rounded border px-3 py-2">
            <p className="font-medium">{p.title} <span className="font-normal text-gray-500">({p.kind})</span></p>
            <p className="text-gray-600">{[p.provider, p.held_on, p.hours != null ? `${p.hours} jam` : null].filter(Boolean).join(" · ")}</p>
            {p.notes ? <p className="mt-1 whitespace-pre-wrap">{p.notes}</p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
