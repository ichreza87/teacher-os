import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { isS3Configured } from "@/integrations/storage/s3";
import { getIntegration } from "@/integrations/secrets";
import { ContextNote } from "@/components/ui";

export default async function IntegrationsPage() {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Integrations</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId } = res.ctx;

  const [notion, google] = await Promise.all([
    getIntegration(supabase, userId, "notion"),
    getIntegration(supabase, userId, "google"),
  ]);

  const s3 = isS3Configured();
  const posthog = Boolean(process.env.POSTHOG_KEY);

  const cards = [
    {
      name: "Object Storage (S3)",
      desc: "Berkas asli Knowledge Base. Tanpa S3, otomatis memakai Supabase Storage.",
      status: s3 ? "S3 terkonfigurasi" : "Supabase Storage (fallback)",
      href: null as string | null,
    },
    {
      name: "Notion",
      desc: "Impor halaman ke Knowledge Base, export konten ke Notion.",
      status: notion ? `Terhubung (${notion.status})` : "Belum terhubung",
      href: "/integrations/notion",
    },
    {
      name: "Google Workspace",
      desc: "Drive, Docs, Sheets, Calendar. Token terenkripsi, izin minimal.",
      status: google ? `Terhubung (${google.status})` : "Belum terhubung",
      href: "/integrations/google",
    },
    {
      name: "PostHog Analytics",
      desc: "Analitik produk tanpa PII siswa. Mati otomatis tanpa key.",
      status: posthog ? "Aktif" : "Nonaktif (tanpa key)",
      href: null as string | null,
    },
  ];

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Integrations</h1>
      <p className="mt-1 text-sm text-gray-600">Koneksi bersifat per pengguna. Token OAuth disimpan terenkripsi.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.name} className="rounded border p-4">
            <p className="font-medium">{c.name}</p>
            <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
            <p className="mt-2 text-sm">Status: {c.status}</p>
            {c.href && (
              <Link href={c.href} className="mt-2 inline-block rounded border px-3 py-1 text-sm">Kelola</Link>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
