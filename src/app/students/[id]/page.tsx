import { notFound } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { addParent } from "@/modules/students/actions";

export default async function StudentDetailPage({
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
        <main className="p-8"><h1 className="text-2xl font-semibold">Profil Siswa</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, nisn, gender, birth_place, birth_date, address, phone")
    .eq("id", params.id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!student) notFound();

  const [{ data: parents }, { data: enrollments }] = await Promise.all([
    supabase.from("parents").select("id, relation, full_name, phone, email, occupation").eq("student_id", params.id).order("relation"),
    supabase
      .from("enrollments")
      .select("id, status, classes(id, name)")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const addParentTo = addParent.bind(null, params.id);

  return (
    <main className="max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{student.full_name}</h1>
      <dl className="mt-3 space-y-1 rounded border p-4 text-sm">
        <div className="flex gap-2"><dt className="w-32 text-gray-500">NISN</dt><dd>{student.nisn ?? "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">L/P</dt><dd>{student.gender ?? "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Lahir</dt><dd>{[student.birth_place, student.birth_date].filter(Boolean).join(", ") || "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Alamat</dt><dd>{student.address ?? "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Telepon</dt><dd>{student.phone ?? "-"}</dd></div>
      </dl>

      <h2 className="mt-6 font-medium">Riwayat kelas</h2>
      {(enrollments ?? []).length === 0 ? (
        <p className="mt-1 text-sm text-gray-600">Belum terdaftar di kelas mana pun. Daftarkan dari halaman kelas.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {(enrollments ?? []).map((e) => (
            <li key={e.id} className="rounded border px-3 py-1">
              {(e.classes as unknown as { name: string } | null)?.name ?? "?"} · {e.status}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 font-medium">Orang tua / wali</h2>
      <ul className="mt-1 space-y-1 text-sm">
        {(parents ?? []).map((p) => (
          <li key={p.id} className="rounded border px-3 py-1">
            <span className="font-medium">{p.full_name}</span> ({p.relation})
            {[p.phone, p.email, p.occupation].filter(Boolean).join(" · ")}
          </li>
        ))}
        {(parents ?? []).length === 0 && <li className="text-sm text-gray-600">Belum ada data orang tua/wali.</li>}
      </ul>

      <form action={addParentTo} className="mt-3 space-y-3 rounded border p-4">
        <p className="text-sm font-medium">Tambah orang tua / wali</p>
        <FormError message={searchParams.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hubungan" htmlFor="relation">
            <select id="relation" name="relation" className={inputCls} defaultValue="ayah">
              <option value="ayah">Ayah</option>
              <option value="ibu">Ibu</option>
              <option value="wali">Wali</option>
            </select>
          </Field>
          <Field label="Nama" htmlFor="pname">
            <input id="pname" name="fullName" required className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Telepon" htmlFor="pphone">
            <input id="pphone" name="phone" type="tel" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Email" htmlFor="pemail">
            <input id="pemail" name="email" type="email" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <Field label="Pekerjaan" htmlFor="pocc">
          <input id="pocc" name="occupation" className={inputCls} autoComplete="off" />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Tambah</button>
      </form>
    </main>
  );
}
