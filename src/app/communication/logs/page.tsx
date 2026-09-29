import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { waLink } from "@/modules/communication/helpers";
import { ContextNote, FormError, PageHeader } from "@/components/ui";
import { setLogStatus } from "@/modules/communication/actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  approved: "Disetujui",
  sent: "Terkirim",
  cancelled: "Dibatalkan",
};

export default async function LogsPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Riwayat Pesan</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: logs } = await res.ctx.supabase
    .from("communication_logs")
    .select("id, channel, recipient_name, recipient_contact, subject, body, status, sent_at, created_at, students(full_name)")
    .eq("school_id", res.ctx.schoolId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-3xl p-8">
      <PageHeader title="Riwayat Pesan" desc="Draf → setujui → kirim manual → tandai terkirim."
        actionHref="/communication/logs/new" actionLabel="+ Tulis Pesan" />
      <FormError message={searchParams.error} />
      {(logs ?? []).length === 0 ? (
        <p className="mt-4 rounded border p-6 text-center text-sm text-gray-600">Belum ada pesan.</p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {(logs ?? []).map((l) => {
            const student = (l.students as unknown as { full_name: string } | null)?.full_name;
            const wa = l.status === "approved" ? waLink(l.recipient_contact as string | null, l.body as string) : null;
            return (
              <li key={l.id} className="rounded border p-3">
                <p className="font-medium">
                  {l.subject ? `${l.subject} — ` : ""}{l.recipient_name ?? "Tanpa nama"}
                  <span className="ml-2 font-normal text-gray-500">
                    [{STATUS_LABEL[l.status as string] ?? l.status}] · {l.channel}
                    {student ? ` · untuk ${student}` : ""}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-gray-700">{l.body}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.status === "draft" && (
                    <>
                      <form action={setLogStatus.bind(null, l.id, "approved")}>
                        <button type="submit" className="rounded bg-black px-2 py-1 text-xs text-white">Setujui</button>
                      </form>
                      <form action={setLogStatus.bind(null, l.id, "cancelled")}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs">Batalkan</button>
                      </form>
                    </>
                  )}
                  {l.status === "approved" && (
                    <>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="rounded border px-2 py-1 text-xs">
                          Buka WhatsApp (kirim manual)
                        </a>
                      )}
                      <form action={setLogStatus.bind(null, l.id, "sent")}>
                        <button type="submit" className="rounded bg-black px-2 py-1 text-xs text-white">Tandai Terkirim</button>
                      </form>
                      <form action={setLogStatus.bind(null, l.id, "cancelled")}>
                        <button type="submit" className="rounded border px-2 py-1 text-xs">Batalkan</button>
                      </form>
                    </>
                  )}
                  {l.status === "sent" && l.sent_at && (
                    <span className="text-xs text-gray-500">
                      Ditandai terkirim {new Date(l.sent_at as string).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
