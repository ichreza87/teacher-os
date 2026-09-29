import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { retrieve } from "@/knowledge/retrieval";
import { ContextNote, FormError, inputCls } from "@/components/ui";

export default async function KnowledgeSearchPage({
  searchParams,
}: {
  searchParams: { q?: string; error?: string };
}) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Cari Pengetahuan</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const q = (searchParams.q ?? "").trim();
  let results: Awaited<ReturnType<typeof retrieve>> = [];
  let error: string | undefined = searchParams.error;
  if (q && !error) {
    try {
      results = await retrieve(res.ctx.supabase, res.ctx.userId, res.ctx.teacherId, q, 8);
    } catch (e) {
      error = e instanceof Error ? e.message : "Pencarian gagal.";
    }
  }

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Cari Pengetahuan</h1>
      <p className="mt-1 text-sm text-gray-600">Pencarian semantik di seluruh koleksi Anda.</p>
      <form method="get" className="mt-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="cth. strategi diferensiasi..." aria-label="Kueri pencarian"
          className={inputCls} autoComplete="off" />
        <button type="submit" className="shrink-0 rounded bg-black px-4 py-2 text-sm text-white">Cari</button>
      </form>
      <FormError message={error} />
      {q && !error && (
        <div className="mt-4 space-y-2 text-sm">
          {results.length === 0 && <p className="text-gray-600">Tidak ada hasil.</p>}
          {results.map((r) => (
            <div key={r.chunkId} className="rounded border px-3 py-2">
              <p>
                <Link href={`/knowledge/${r.documentId}`} className="font-medium underline">{r.title}</Link>
                <span className="ml-2 text-xs text-gray-500">kemiripan {r.similarity.toFixed(3)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-gray-700">{r.content.slice(0, 400)}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
