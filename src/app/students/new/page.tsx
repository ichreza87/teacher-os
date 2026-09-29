import { createStudent } from "@/modules/students/actions";
import { Field, FormError, inputCls } from "@/components/ui";

export default function NewStudentPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Tambah Siswa</h1>
      <form action={createStudent} className="mt-4 space-y-3">
        <FormError message={searchParams.error} />
        <Field label="Nama lengkap" htmlFor="fullName">
          <input id="fullName" name="fullName" required className={inputCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="NISN (opsional)" htmlFor="nisn">
            <input id="nisn" name="nisn" inputMode="numeric" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Jenis kelamin" htmlFor="gender">
            <select id="gender" name="gender" className={inputCls} defaultValue="">
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tempat lahir" htmlFor="birthPlace">
            <input id="birthPlace" name="birthPlace" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Tanggal lahir" htmlFor="birthDate">
            <input id="birthDate" name="birthDate" type="date" className={inputCls} />
          </Field>
        </div>
        <Field label="Alamat" htmlFor="address">
          <input id="address" name="address" className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Telepon" htmlFor="phone">
          <input id="phone" name="phone" type="tel" className={inputCls} autoComplete="off" />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">Simpan Siswa</button>
      </form>
    </main>
  );
}
