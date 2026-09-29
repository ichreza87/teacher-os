import { getLevelCodes } from "@/config/levels";
import { Field, FormError, inputCls } from "@/components/ui";
import { uploadDocument } from "@/modules/knowledge/actions";

export default function NewDocumentPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Upload Dokumen</h1>
      <p className="mt-1 text-sm text-gray-600">PDF, DOCX, TXT, MD, CSV, XLSX — maks 10 MB. Teks diekstrak, dipotong, dan di-embedding.</p>
      <form action={uploadDocument} className="mt-4 space-y-3">
        <FormError message={searchParams.error} />
        <Field label="File" htmlFor="file">
          <input id="file" name="file" type="file" required accept=".pdf,.docx,.txt,.md,.csv,.xlsx" className={inputCls} />
        </Field>
        <Field label="Judul (opsional, default nama file)" htmlFor="title">
          <input id="title" name="title" className={inputCls} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mapel (opsional)" htmlFor="subject">
            <input id="subject" name="subject" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Jenjang (opsional)" htmlFor="level">
            <select id="level" name="level" className={inputCls} defaultValue="">
              <option value="">-</option>
              {getLevelCodes().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">Upload & Proses</button>
      </form>
    </main>
  );
}
