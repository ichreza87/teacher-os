import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, PageHeader } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = { processing: "Memproses", ready: "Siap", failed: "Gagal" };

export default async function KnowledgePage() {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Knowledge Base</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: docs } = await res.ctx.supabase
    .from("knowledge_documents")
    .select("id, title, subject, status, chunk_count, created_at")
    .eq("owner_user_id", res.ctx.userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="p-8">
      <PageHeader title="Knowledge Base" desc="Koleksi pengetahuan pribadi: buku, artikel, dokumen kurikulum, catatan."
        actionHref="/knowledge/new" actionLabel="+ Upload Dokumen" />
      <p className="mt-2 text-sm">
        <Link href="/knowledge/search" className="underline">Cari semantik</Link> di seluruh koleksi.
      </p>
      {(docs ?? []).length === 0 ? (
        <EmptyState title="Belum ada dokumen." desc="Upload PDF, DOCX, TXT, MD, CSV, atau XLSX (maks 10 MB)."
          actionHref="/knowledge/new" actionLabel="+ Upload Dokumen" />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border">
          {(docs ?? []).map((d) => (
            <li key={d.id}>
              <Link href={`/knowledge/${d.id}`} className="block px-4 py-2 hover:bg-gray-50">
                <span className="font-medium">{d.title}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {[d.subject, STATUS_LABEL[d.status as string] ?? d.status, d.status === "ready" ? `${d.chunk_count} potongan` : null].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 max-w-3xl text-xs text-gray-500">
        Catatan: yang disimpan adalah teks hasil ekstraksi beserta embedding-nya.
        Berkas asli belum disimpan permanen (object storage tiba di Phase 5).
      </p>
    </main>
  );
}
