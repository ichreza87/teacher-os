"use server";

import { redirect } from "next/navigation";
import { google } from "googleapis";
import { getSchoolContext } from "@/lib/school";
import { disconnectProvider, getDecryptedToken } from "@/integrations/secrets";
import { googleClientFromTokens, type GoogleTokens } from "@/integrations/google/oauth";

function fail(message: string): never {
  redirect(`/integrations/google?error=${encodeURIComponent(message)}`);
}

function googleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    fail("GOOGLE_CLIENT_ID/SECRET belum diisi di server.");
  }
  return { clientId, clientSecret };
}

async function googleAuth() {
  const res = await getSchoolContext();
  if (!res.ok) fail(res.message);
  const { clientId, clientSecret } = googleEnv();
  const raw = await getDecryptedToken(res.ctx.supabase, res.ctx.userId, "google");
  if (!raw) fail("Google belum terhubung. Hubungkan dulu di halaman ini.");
  const tokens = JSON.parse(raw) as GoogleTokens;
  const auth = googleClientFromTokens({ clientId, clientSecret, tokens });
  const persist = async () => {
    const creds = auth.credentials;
    if (creds.access_token && creds.access_token !== tokens.access_token) {
      const { encryptSecret } = await import("@/lib/crypto");
      const sealed = encryptSecret(JSON.stringify({
        access_token: creds.access_token,
        refresh_token: creds.refresh_token ?? tokens.refresh_token,
        expiry_date: creds.expiry_date,
      }));
      await res.ctx.supabase.from("integration_secrets").update({
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
      }).eq("integration_id", (await res.ctx.supabase.from("integrations").select("id")
        .eq("owner_user_id", res.ctx.userId).eq("provider", "google").maybeSingle()).data?.id ?? "");
    }
  };
  return { ...res.ctx, auth, persist };
}

/** Export assessment results as CSV and upload to Google Drive. */
export async function exportAssessmentToDrive(assessmentId: string): Promise<never> {
  const ctx = await googleAuth();
  const { data: assessment } = await ctx.supabase
    .from("assessments")
    .select("id, title, max_score, class_id, classes(name)")
    .eq("id", assessmentId)
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  if (!assessment) fail("Asesmen tidak ditemukan.");
  const [{ data: enrollments }, { data: results }] = await Promise.all([
    ctx.supabase.from("enrollments").select("student_id, students(full_name)").eq("class_id", assessment.class_id).eq("status", "aktif"),
    ctx.supabase.from("assessment_results").select("student_id, score, feedback").eq("assessment_id", assessmentId),
  ]);
  const byId = new Map((results ?? []).map((r) => [r.student_id as string, r]));
  const lines = ["nama,skor,umpan_balik"];
  for (const e of enrollments ?? []) {
    const name = (e.students as unknown as { full_name: string } | null)?.full_name ?? "?";
    const r = byId.get(e.student_id as string);
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    lines.push([cell(name), r ? String(r.score) : "", cell(r?.feedback ? String(r.feedback) : "")].join(","));
  }
  try {
    const drive = google.drive({ version: "v3", auth: ctx.auth });
    const file = await drive.files.create({
      requestBody: { name: `${assessment.title}.csv`, mimeType: "text/csv" },
      media: { mimeType: "text/csv", body: lines.join("\n") },
      fields: "id, webViewLink",
    });
    await ctx.persist();
    redirect(`/integrations/google?exported=${encodeURIComponent(file.data.webViewLink ?? "Tersimpan di Drive (tanpa link).")}`);
  } catch (e) {
    fail(`Export Drive gagal: ${e instanceof Error ? e.message : "unknown"}.`);
  }
}

/** Create a Google Doc from a material's content. */
export async function materialToDoc(materialId: string): Promise<never> {
  const ctx = await googleAuth();
  const { data: material } = await ctx.supabase
    .from("materials")
    .select("id, title, body")
    .eq("id", materialId)
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  if (!material) fail("Materi tidak ditemukan.");
  try {
    const docs = google.docs({ version: "v1", auth: ctx.auth });
    const created = await docs.documents.create({ requestBody: { title: (material.title as string).slice(0, 100) } });
    const docId = created.data.documentId as string;
    const body = ((material.body as string) ?? "").slice(0, 50_000) || "(materi tanpa isi)";
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: body } }] },
    });
    await ctx.persist();
    redirect(`/integrations/google?exported=${encodeURIComponent(`https://docs.google.com/document/d/${docId}`)}`);
  } catch (e) {
    fail(`Buat Google Doc gagal: ${e instanceof Error ? e.message : "unknown"}.`);
  }
}

/** Export assessment results into a new Google Sheet. */
export async function assessmentToSheet(assessmentId: string): Promise<never> {
  const ctx = await googleAuth();
  const { data: assessment } = await ctx.supabase
    .from("assessments")
    .select("id, title, class_id")
    .eq("id", assessmentId)
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  if (!assessment) fail("Asesmen tidak ditemukan.");
  const [{ data: enrollments }, { data: results }] = await Promise.all([
    ctx.supabase.from("enrollments").select("student_id, students(full_name)").eq("class_id", assessment.class_id).eq("status", "aktif"),
    ctx.supabase.from("assessment_results").select("student_id, score, feedback").eq("assessment_id", assessmentId),
  ]);
  const byId = new Map((results ?? []).map((r) => [r.student_id as string, r]));
  const values = [["Nama", "Skor", "Umpan balik"]];
  for (const e of enrollments ?? []) {
    const name = (e.students as unknown as { full_name: string } | null)?.full_name ?? "?";
    const r = byId.get(e.student_id as string);
    values.push([name, r ? String(r.score) : "", r?.feedback ? String(r.feedback) : ""]);
  }
  try {
    const sheets = google.sheets({ version: "v4", auth: ctx.auth });
    const created = await sheets.spreadsheets.create({
      requestBody: { properties: { title: `${assessment.title} - Nilai`.slice(0, 100) } },
    });
    const sheetId = created.data.spreadsheetId as string;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values },
    });
    await ctx.persist();
    redirect(`/integrations/google?exported=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${sheetId}`)}`);
  } catch (e) {
    fail(`Export Sheets gagal: ${e instanceof Error ? e.message : "unknown"}.`);
  }
}

/** Push a calendar event to Google Calendar. */
export async function pushEventToCalendar(eventId: string): Promise<never> {
  const ctx = await googleAuth();
  const { data: event } = await ctx.supabase
    .from("calendar_events")
    .select("id, title, description, starts_at, ends_at")
    .eq("id", eventId)
    .eq("school_id", ctx.schoolId)
    .maybeSingle();
  if (!event) fail("Agenda tidak ditemukan.");
  try {
    const cal = google.calendar({ version: "v3", auth: ctx.auth });
    const created = await cal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title as string,
        description: (event.description as string) ?? undefined,
        start: { dateTime: new Date(event.starts_at as string).toISOString() },
        end: {
          dateTime: new Date(
            ((event.ends_at as string) ?? new Date(new Date(event.starts_at as string).getTime() + 3600_000).toISOString())
          ).toISOString(),
        },
      },
    });
    await ctx.persist();
    redirect(`/integrations/google?exported=${encodeURIComponent(created.data.htmlLink ?? "Tersimpan di Google Calendar.")}`);
  } catch (e) {
    fail(`Kirim ke Calendar gagal: ${e instanceof Error ? e.message : "unknown"}.`);
  }
}

export async function disconnectGoogle(): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(res.message);
  await disconnectProvider(res.ctx.supabase, res.ctx.userId, "google");
  redirect("/integrations/google?disconnected=1");
}
