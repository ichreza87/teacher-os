import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { renderTemplate } from "@/modules/communication/helpers";
import { ContextNote, Field, FormError, PageHeader, inputCls } from "@/components/ui";
import { createDraft } from "@/modules/communication/actions";

export default async function NewDraftPage({ searchParams }: {
  searchParams: { error?: string; student?: string; template?: string };
}) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Tulis Pesan</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId, userId } = res.ctx;

  const [{ data: students }, { data: templates }] = await Promise.all([
    supabase.from("students").select("id, full_name").eq("school_id", schoolId).is("deleted_at", null).order("full_name").limit(200),
    supabase.from("communication_templates").select("id, title, body").eq("school_id", schoolId).order("created_at", { ascending: false }),
  ]);

  // Prefill: template body rendered with student context (server roundtrip, no JS).
  let prefill = "";
  let prefillMissing: string[] = [];
  let recipientName = "";
  let recipientContact = "";
  if (searchParams.template || searchParams.student) {
    const template = (templates ?? []).find((t) => t.id === searchParams.template);
    const student = (students ?? []).find((s) => s.id === searchParams.student);
    if (template) {
      let className = "";
      let parent: { full_name: string; phone: string | null } | null = null;
      if (student) {
        const [{ data: enroll }, { data: parents }, { data: school }, { data: teacher }] = await Promise.all([
          supabase.from("enrollments").select("class_id, classes(name)").eq("student_id", student.id).eq("status", "aktif").limit(1).maybeSingle(),
          supabase.from("parents").select("full_name, phone").eq("student_id", student.id).order("relation").limit(1),
          supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
          supabase.from("teachers").select("user_id").eq("user_id", userId).limit(1).maybeSingle(),
        ]);
        void teacher;
        className = ((enroll?.classes as unknown as { name: string } | null)?.name) ?? "";
        parent = (parents?.[0] as { full_name: string; phone: string | null } | undefined) ?? null;
        recipientName = parent?.full_name ?? "";
        recipientContact = parent?.phone ?? "";
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
        const rendered = renderTemplate(template.body as string, {
          nama_siswa: student.full_name as string,
          nama_guru: (profile?.full_name as string) ?? "",
          kelas: className,
          sekolah: (school?.name as string) ?? "",
          tanggal: new Date().toLocaleDateString("id-ID", { dateStyle: "long" }),
        });
        prefill = rendered.text;
        prefillMissing = rendered.missing;
      } else {
        prefill = template.body as string;
      }
    }
  }

  return (
    <main className="max-w-xl p-8">
      <PageHeader title="Tulis Pesan" desc="Draf selalu menunggu persetujuan sebelum ditandai terkirim." />
      <form method="get" className="mt-4 grid grid-cols-2 gap-3 rounded border p-4">
        <p className="col-span-2 text-sm font-medium">1. Pilih siswa & template untuk mengisi otomatis</p>
        <Field label="Siswa (opsional)" htmlFor="student">
          <select id="student" name="student" className={inputCls} defaultValue={searchParams.student ?? ""}>
            <option value="">-</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Template (opsional)" htmlFor="template">
          <select id="template" name="template" className={inputCls} defaultValue={searchParams.template ?? ""}>
            <option value="">-</option>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </Field>
        <div className="col-span-2">
          <button type="submit" className="rounded border px-3 py-1 text-sm">Isi Otomatis</button>
        </div>
      </form>

      <form action={createDraft} className="mt-4 space-y-3 rounded border p-4">
        <p className="text-sm font-medium">2. Tulis draf</p>
        <FormError message={searchParams.error} />
        {prefillMissing.length > 0 && (
          <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs">
            Placeholder belum terisi: {prefillMissing.map((m) => `{{${m}}}`).join(", ")} — lengkapi manual di bawah.
          </p>
        )}
        <input type="hidden" name="studentId" value={searchParams.student ?? ""} />
        <input type="hidden" name="templateId" value={searchParams.template ?? ""} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama penerima" htmlFor="recipientName">
            <input id="recipientName" name="recipientName" defaultValue={recipientName} className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Kontak penerima" htmlFor="recipientContact">
            <input id="recipientContact" name="recipientContact" defaultValue={recipientContact} className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Saluran (manual)" htmlFor="channel">
            <select id="channel" name="channel" className={inputCls} defaultValue="whatsapp_manual">
              <option value="whatsapp_manual">WhatsApp (manual)</option>
              <option value="email_manual">Email (manual)</option>
              <option value="other_manual">Lainnya (manual)</option>
            </select>
          </Field>
          <Field label="Subjek (opsional)" htmlFor="subject">
            <input id="subject" name="subject" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <Field label="Isi pesan" htmlFor="body">
          <textarea id="body" name="body" required rows={6} defaultValue={prefill} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Simpan Draf</button>
      </form>
    </main>
  );
}
