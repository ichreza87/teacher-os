import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { buildGoogleAuthUrl } from "@/integrations/google/oauth";
import { getDecryptedToken } from "@/integrations/secrets";
import { ContextNote, FormError } from "@/components/ui";
import {
  assessmentToSheet,
  disconnectGoogle,
  exportAssessmentToDrive,
  materialToDoc,
  pushEventToCalendar,
} from "./actions";

export default async function GooglePage({ searchParams }: {
  searchParams: { error?: string; exported?: string; disconnected?: string };
}) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Google Workspace</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId, schoolId } = res.ctx;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = await getDecryptedToken(supabase, userId, "google");

  if (!token) {
    if (!clientId) {
      return (
        <main className="max-w-xl p-8">
          <h1 className="text-2xl font-semibold">Google Workspace</h1>
          <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-medium">Integrasi Google belum dikonfigurasi di server</p>
            <ol className="mt-2 list-decimal pl-5">
              <li>Buat OAuth client di Google Cloud Console (redirect: {appUrl}/api/integrations/google/callback).</li>
              <li>Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env, lalu restart.</li>
            </ol>
          </div>
        </main>
      );
    }
    const connectUrl = buildGoogleAuthUrl({
      clientId,
      redirectUri: `${appUrl}/api/integrations/google/callback`,
      state: userId,
    });
    return (
      <main className="max-w-xl p-8">
        <h1 className="text-2xl font-semibold">Google Workspace</h1>
        <p className="mt-2 text-sm text-gray-600">
          Izin minimal: Drive (file yang dibuat aplikasi), Docs, Sheets, Calendar.
          Token disimpan terenkripsi dan izin bisa dicabut kapan saja.
        </p>
        <a href={connectUrl} className="mt-4 inline-block rounded bg-black px-4 py-2 text-sm text-white">
          Hubungkan Google
        </a>
      </main>
    );
  }

  const [{ data: assessments }, { data: materials }, { data: events }] = await Promise.all([
    supabase.from("assessments").select("id, title").eq("school_id", schoolId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(50),
    supabase.from("materials").select("id, title").eq("school_id", schoolId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(50),
    supabase.from("calendar_events").select("id, title, starts_at").eq("school_id", schoolId).order("starts_at", { ascending: false }).limit(50),
  ]);

  return (
    <main className="max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Google Workspace</h1>
      <p className="mt-1 text-sm text-gray-600">Status: terhubung.</p>
      <FormError message={searchParams.error} />
      {searchParams.exported && (
        <p className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm">
          Export berhasil: <a href={searchParams.exported} target="_blank" rel="noreferrer" className="underline">buka hasil</a>
        </p>
      )}

      <section className="mt-6 rounded border p-4">
        <p className="font-medium">Nilai asesmen → Google Drive (CSV) / Sheets</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(assessments ?? []).length === 0 && <li className="text-gray-600">Belum ada asesmen.</li>}
          {(assessments ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <span className="flex-1">{a.title}</span>
              <form action={exportAssessmentToDrive.bind(null, a.id)}>
                <button type="submit" className="rounded border px-2 py-1 text-xs">Drive CSV</button>
              </form>
              <form action={assessmentToSheet.bind(null, a.id)}>
                <button type="submit" className="rounded border px-2 py-1 text-xs">Sheets</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded border p-4">
        <p className="font-medium">Materi → Google Docs</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(materials ?? []).length === 0 && <li className="text-gray-600">Belum ada materi.</li>}
          {(materials ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span className="flex-1">{m.title}</span>
              <form action={materialToDoc.bind(null, m.id)}>
                <button type="submit" className="rounded border px-2 py-1 text-xs">Buat Doc</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded border p-4">
        <p className="font-medium">Agenda → Google Calendar</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(events ?? []).length === 0 && <li className="text-gray-600">Belum ada agenda.</li>}
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span className="flex-1">{e.title}</span>
              <form action={pushEventToCalendar.bind(null, e.id)}>
                <button type="submit" className="rounded border px-2 py-1 text-xs">Kirim</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <form action={disconnectGoogle} className="mt-6">
        <button type="submit" className="rounded border px-3 py-1 text-sm">Putuskan Google (token dihapus)</button>
      </form>
    </main>
  );
}
