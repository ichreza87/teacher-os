import Link from "next/link";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { ContextNote, EmptyState, PageHeader } from "@/components/ui";

export default async function CommunicationPage() {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Communication</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, parents(relation, full_name, phone)")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(200);

  return (
    <main className="p-8">
      <PageHeader title="Communication" desc="Direktori orang tua/wali dan riwayat pesan."
        actionHref="/communication/logs/new" actionLabel="+ Tulis Pesan" />
      <p className="mt-2 text-sm">
        <Link href="/communication/templates" className="underline">Kelola template</Link>
        {" · "}
        <Link href="/communication/logs" className="underline">Riwayat pesan</Link>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Teacher OS tidak mengirim pesan otomatis. Draf disetujui guru, pengiriman dilakukan manual (mis. via WhatsApp).
      </p>
      {(students ?? []).length === 0 ? (
        <EmptyState title="Belum ada siswa." desc="Tambahkan siswa dulu untuk melihat direktori orang tua." />
      ) : (
        <ul className="mt-4 max-w-3xl divide-y rounded border text-sm">
          {(students ?? []).map((s) => {
            const parents = (s.parents ?? []) as { relation: string; full_name: string; phone: string | null }[];
            return (
              <li key={s.id} className="px-4 py-2">
                <Link href={`/students/${s.id}`} className="font-medium underline">{s.full_name}</Link>
                {parents.length === 0 ? (
                  <span className="ml-2 text-gray-500">tanpa data orang tua</span>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-gray-600">
                    {parents.map((p, i) => (
                      <li key={i}>
                        {p.full_name} ({p.relation}){p.phone ? ` · ${p.phone}` : " · tanpa telepon"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
