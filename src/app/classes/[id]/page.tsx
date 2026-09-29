import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { enrollStudent } from "@/modules/classes/actions";

export default async function ClassDetailPage({
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
        <main className="p-8"><h1 className="text-2xl font-semibold">Detail Kelas</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, grade, academic_year_id")
    .eq("id", params.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!cls) notFound();

  const [{ data: enrollments }, { data: students }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("id, status, student_id, students(id, full_name)")
      .eq("class_id", params.id)
      .eq("status", "aktif"),
    supabase
      .from("students")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("full_name")
      .limit(200),
  ]);

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.student_id));
  const candidates = (students ?? []).filter((s) => !enrolledIds.has(s.id));
  const enrollTo = enrollStudent.bind(null, params.id);

  return (
    <main className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Kelas {cls.name}</h1>
      {cls.grade && <p className="mt-1 text-sm text-gray-600">Tingkat {cls.grade}</p>}

      <h2 className="mt-6 font-medium">Siswa terdaftar ({(enrollments ?? []).length})</h2>
      {(enrollments ?? []).length === 0 ? (
        <p className="mt-1 text-sm text-gray-600">Belum ada siswa di kelas ini.</p>
      ) : (
        <ul className="mt-1 divide-y rounded border text-sm">
          {(enrollments ?? []).map((e) => (
            <li key={e.id} className="px-3 py-1">
              <Link href={`/students/${e.student_id}`} className="underline">
                {(e.students as unknown as { full_name: string } | null)?.full_name ?? "?"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={enrollTo} className="mt-4 space-y-3 rounded border p-4">
        <p className="text-sm font-medium">Daftarkan siswa ke kelas ini</p>
        <FormError message={searchParams.error} />
        <Field label="Siswa" htmlFor="studentId">
          <select id="studentId" name="studentId" className={inputCls} defaultValue="" required>
            <option value="">Pilih siswa</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Daftarkan</button>
      </form>
    </main>
  );
}
