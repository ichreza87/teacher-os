import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, PageHeader } from "@/components/ui";

export default async function StudentsPage({ searchParams }: { searchParams: { q?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Students</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("students")
    .select("id, full_name, nisn, gender")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(100);
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data: students } = await query;

  return (
    <main className="p-8">
      <PageHeader title="Students" desc="Database siswa sekolah Anda." actionHref="/students/new" actionLabel="+ Tambah Siswa" />
      <form method="get" className="mt-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Cari nama siswa..." aria-label="Cari siswa"
          className="w-full rounded border px-3 py-2" />
        <button type="submit" className="rounded border px-4 py-2">Cari</button>
      </form>
      {(students ?? []).length === 0 ? (
        <EmptyState title="Belum ada siswa." desc={q ? "Tidak cocok dengan pencarian." : "Tambahkan siswa pertama Anda."}
          actionHref="/students/new" actionLabel="+ Tambah Siswa" />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(students ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/students/${s.id}`} className="block px-4 py-2 hover:bg-gray-50">
                <span className="font-medium">{s.full_name}</span>
                <span className="ml-2 text-sm text-gray-500">{s.nisn ?? "tanpa NISN"}{s.gender ? ` · ${s.gender}` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
