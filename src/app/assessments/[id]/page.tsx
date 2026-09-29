import { notFound } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, FormError, inputCls } from "@/components/ui";
import { saveScores } from "@/modules/assessments/actions";

export default async function AssessmentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Detail Asesmen</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, title, kind, scheduled_on, max_score, class_id, classes(id, name)")
    .eq("id", params.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!assessment) notFound();

  const [{ data: enrollments }, { data: results }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id, students(id, full_name)")
      .eq("class_id", assessment.class_id)
      .eq("status", "aktif")
      .order("created_at"),
    supabase.from("assessment_results").select("student_id, score, feedback").eq("assessment_id", params.id),
  ]);

  const resultByStudent = new Map((results ?? []).map((r) => [r.student_id as string, r]));
  const rows = (enrollments ?? []).map((e) => ({
    id: e.student_id as string,
    name: (e.students as unknown as { full_name: string } | null)?.full_name ?? "?",
    result: resultByStudent.get(e.student_id as string),
  }));
  const scored = rows.filter((r) => r.result);
  const avg = scored.length > 0 ? scored.reduce((s, r) => s + Number(r.result!.score), 0) / scored.length : null;
  const saveTo = saveScores.bind(null, params.id);

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{assessment.title}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {[assessment.kind, (assessment.classes as unknown as { name: string } | null)?.name,
          assessment.scheduled_on ? `jadwal ${assessment.scheduled_on}` : null,
          `maks ${assessment.max_score}`].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-2 text-sm">
        Terisi {scored.length}/{rows.length} siswa
        {avg !== null && ` · rata-rata ${avg.toFixed(1)}`}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded border p-4 text-sm text-gray-600">
          Kelas ini belum memiliki siswa terdaftar. Daftarkan siswa dari halaman kelas terlebih dahulu.
        </p>
      ) : (
        <form action={saveTo} className="mt-4">
          <FormError message={searchParams.error} />
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="border px-3 py-2">Siswa</th>
                <th className="border px-3 py-2">Skor (0–{assessment.max_score})</th>
                <th className="border px-3 py-2">Umpan balik</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="border px-3 py-2">{r.name}</td>
                  <td className="border px-3 py-2">
                    <input name={`score_${r.id}`} type="number" min={0} max={Number(assessment.max_score)} step="any"
                      defaultValue={r.result ? String(r.result.score) : ""} aria-label={`Skor ${r.name}`}
                      className={inputCls} />
                  </td>
                  <td className="border px-3 py-2">
                    <input name={`feedback_${r.id}`} defaultValue={r.result?.feedback ?? ""} aria-label={`Umpan balik ${r.name}`}
                      className={inputCls} autoComplete="off" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="submit" className="mt-3 rounded bg-black px-4 py-2 text-sm text-white">Simpan Nilai</button>
        </form>
      )}
    </main>
  );
}
