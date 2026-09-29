import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { createNotionClient, searchPages } from "@/integrations/notion/client";
import { buildAuthorizeUrl } from "@/integrations/notion/oauth";
import { getDecryptedToken, getIntegration } from "@/integrations/secrets";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { disconnectNotion, exportToNotion, importNotionPage, searchAction } from "./actions";

export default async function NotionPage({ searchParams }: {
  searchParams: { q?: string; error?: string; exported?: string; disconnected?: string };
}) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Notion</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId } = res.ctx;

  const clientId = process.env.NOTION_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = await getDecryptedToken(supabase, userId, "notion");
  const integration = await getIntegration(supabase, userId, "notion");

  if (!token) {
    if (!clientId) {
      return (
        <main className="max-w-xl p-8">
          <h1 className="text-2xl font-semibold">Notion</h1>
          <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-medium">Integrasi Notion belum dikonfigurasi di server</p>
            <ol className="mt-2 list-decimal pl-5">
              <li>Buat public integration di notion.so/my-integrations (OAuth redirect: {appUrl}/api/integrations/notion/callback).</li>
              <li>Isi NOTION_CLIENT_ID dan NOTION_CLIENT_SECRET di .env, lalu restart.</li>
            </ol>
          </div>
        </main>
      );
    }
    const connectUrl = buildAuthorizeUrl({
      clientId,
      redirectUri: `${appUrl}/api/integrations/notion/callback`,
      state: userId,
    });
    return (
      <main className="max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Notion</h1>
        <p className="mt-2 text-sm text-gray-600">Hubungkan workspace Notion untuk impor halaman dan export konten.</p>
        <a href={connectUrl} className="mt-4 inline-block rounded bg-black px-4 py-2 text-sm text-white">
          Hubungkan Notion
        </a>
      </main>
    );
  }

  const notion = createNotionClient(token);
  const q = (searchParams.q ?? "").trim();
  const pages = q ? await searchPages(notion, q).catch(() => []) : [];

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Notion</h1>
      <p className="mt-1 text-sm text-gray-600">
        Status: terhubung{(integration?.config as { workspace?: string } | undefined)?.workspace ? ` (${(integration?.config as { workspace?: string }).workspace})` : ""}.
      </p>
      <FormError message={searchParams.error} />
      {searchParams.exported && (
        <p className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm">
          Export berhasil: <a href={searchParams.exported} target="_blank" rel="noreferrer" className="underline">buka di Notion</a>
        </p>
      )}

      <h2 className="mt-6 font-medium">Impor halaman ke Knowledge Base</h2>
      <p className="text-xs text-gray-500">Tidak ada sinkronisasi dua arah otomatis — impor bersifat sekali jalan per halaman (duplikat ditolak).</p>
      <form action={searchAction} className="mt-2 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="Cari halaman Notion..." aria-label="Cari halaman" className={inputCls} autoComplete="off" />
        <button type="submit" className="shrink-0 rounded border px-4 py-2 text-sm">Cari</button>
      </form>
      {q && (
        <ul className="mt-2 divide-y rounded border text-sm">
          {pages.length === 0 && <li className="px-4 py-2 text-gray-600">Tidak ada hasil.</li>}
          {pages.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2">
              <span>{p.title}</span>
              <form action={importNotionPage.bind(null, p.id)}>
                <button type="submit" className="rounded border px-2 py-1 text-xs">Impor</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 font-medium">Export konten ke Notion</h2>
      <form action={exportToNotion} className="mt-2 max-w-xl space-y-3 rounded border p-4">
        <Field label="ID halaman induk Notion" htmlFor="parentPageId" hint="Buka halaman induk di Notion, salin ID dari URL-nya.">
          <input id="parentPageId" name="parentPageId" required className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Judul" htmlFor="ntitle">
          <input id="ntitle" name="title" required className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Isi" htmlFor="ncontent">
          <textarea id="ncontent" name="content" required rows={5} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Export</button>
      </form>

      <form action={disconnectNotion} className="mt-6">
        <button type="submit" className="rounded border px-3 py-1 text-sm">Putuskan Notion (token dihapus)</button>
      </form>
    </main>
  );
}
