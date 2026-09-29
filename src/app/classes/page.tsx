import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, Field, FormError, PageHeader, inputCls } from "@/components/ui";
import { createClass } from "@/modules/classes/actions";

export default async function ClassesPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Classes</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const [{ data: classes }, { data: years }, { data: teachers }] = await Promise.all([
    supabase.from("classes").select("id, name, grade").eq("school_id", schoolId).is("deleted_at", null).order("name"),
    supabase.from("academic_years").select("id, name, is_active").eq("school_id", schoolId).order("name", { ascending: false }),
    supabase.from("teachers").select("id").eq("school_id", schoolId).is("deleted_at", null),
  ]);

  return (
    <main className="p-8">
      <PageHeader title="Classes" desc="Kelas pada sekolah Anda." />
      {(classes ?? []).length === 0 ? (
        <EmptyState title="Belum ada kelas." desc="Buat kelas pertama untuk tahun ajaran aktif." />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(classes ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/classes/${c.id}`} className="block px-4 py-2 hover:bg-gray-50">
                <span className="font-medium">{c.name}</span>
                {c.grade && <span className="ml-2 text-sm text-gray-500">tingkat {c.grade}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={createClass} className="mt-6 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Buat kelas</p>
        <FormError message={searchParams.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama kelas" htmlFor="cname">
            <input id="cname" name="name" required placeholder="cth. 5A" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Tingkat" htmlFor="cgrade">
            <input id="cgrade" name="grade" placeholder="cth. 5" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <Field label="Tahun ajaran" htmlFor="cyear">
          <select id="cyear" name="academicYearId" className={inputCls} defaultValue="">
            <option value="">-</option>
            {(years ?? []).map((y) => (
              <option key={y.id} value={y.id}>{y.name}{y.is_active ? " (aktif)" : ""}</option>
            ))}
          </select>
        </Field>
        <input type="hidden" name="homeroomTeacherId" value="" />
        <p className="text-xs text-gray-500">{(teachers ?? []).length} guru terdaftar — penetapan wali kelas tersedia di detail kelas (Phase 2 lanjutan).</p>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Buat Kelas</button>
      </form>
    </main>
  );
}
