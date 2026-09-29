import { notFound } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, FormError } from "@/components/ui";
import { deleteDocument } from "@/modules/knowledge/actions";

export default async function DocumentDetailPage({
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
        <main className="p-8"><h1 className="text-2xl font-semibold">Dokumen</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId } = res.ctx;

  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("id, title, subject, education_level_code, source_type, mime_type, size_bytes, status, error, chunk_count, created_at")
    .eq("id", params.id)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!doc) notFound();

  const { data: chunks } = await supabase
    .from("knowledge_chunks")
    .select("chunk_index, content")
    .eq("document_id", params.id)
    .order("chunk_index")
    .limit(50);

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{doc.title}</h1>
      <dl className="mt-3 space-y-1 rounded border p-4 text-sm">
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Status</dt><dd>{doc.status}{doc.error ? ` — ${doc.error}` : ""}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Mapel</dt><dd>{doc.subject ?? "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Jenjang</dt><dd>{doc.education_level_code ?? "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Ukuran</dt><dd>{doc.size_bytes != null ? `${Math.round(Number(doc.size_bytes) / 1024)} KB` : "-"}</dd></div>
        <div className="flex gap-2"><dt className="w-32 text-gray-500">Potongan</dt><dd>{doc.chunk_count}</dd></div>
      </dl>

      <h2 className="mt-6 font-medium">Potongan teks ({(chunks ?? []).length} pertama)</h2>
      <div className="mt-2 space-y-2 text-sm">
        {(chunks ?? []).map((c) => (
          <p key={c.chunk_index} className="rounded border px-3 py-2 whitespace-pre-wrap">
            <span className="text-xs text-gray-500">#{c.chunk_index}</span> {c.content}
          </p>
        ))}
        {(chunks ?? []).length === 0 && <p className="text-sm text-gray-600">Belum ada potongan (dokumen masih diproses atau gagal).</p>}
      </div>

      <form action={deleteDocument.bind(null, params.id)} className="mt-6 rounded border p-4">
        <p className="text-sm font-medium">Hapus dokumen beserta seluruh potongannya</p>
        <FormError message={searchParams.error} />
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="confirm" value="ya" /> ya, saya yakin hapus
        </label>
        <button type="submit" className="mt-2 rounded border px-3 py-1 text-sm">Hapus Dokumen</button>
      </form>
    </main>
  );
}
