import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { summarizeForPanel } from "@/ai/prompts/builder";
import { buildTeacherContext } from "@/ai/context/builder";
import { ContextNote, FormError, inputCls } from "@/components/ui";
import { confirmAction, rejectAction, saveAsMaterial, sendMessage } from "@/modules/workspace/actions";

const TYPE_LABEL: Record<string, string> = {
  create_lesson_plan: "Buat modul ajar",
  create_assessment: "Buat asesmen",
  create_material: "Buat materi",
  create_task: "Buat tugas",
  create_event: "Buat agenda",
};

export default async function ConversationPage({
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
        <main className="p-8"><h1 className="text-2xl font-semibold">AI Workspace</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", params.id)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!conv) {
    const { data: exists } = await supabase.from("ai_conversations").select("id").eq("id", params.id).maybeSingle();
    if (!exists) notFound();
    redirect("/workspace?error=Akses ditolak.");
  }

  const snap = await buildTeacherContext(supabase, userId, teacherId, schoolId);
  const [{ data: messages }, { data: actions }] = await Promise.all([
    supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", params.id)
      .order("created_at")
      .limit(100),
    supabase
      .from("ai_actions")
      .select("id, type, payload, risk, status, result, created_at")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const proposed = (actions ?? []).filter((a) => a.status === "proposed");
  const executed = (actions ?? []).filter((a) => a.status === "executed");
  const sendTo = sendMessage.bind(null, params.id);

  return (
    <main className="flex min-h-screen flex-col p-8 lg:flex-row lg:gap-6">
      <aside className="w-full shrink-0 lg:w-72">
        <h1 className="text-xl font-semibold">{conv.title}</h1>
        <div className="mt-3 rounded border p-3 text-sm">
          <p className="font-medium">Konteks</p>
          <ul className="mt-1 space-y-1 text-gray-700">
            {summarizeForPanel(snap).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {snap.classes.length > 0 && (
            <p className="mt-2 text-gray-500">Kelas: {snap.classes.map((c) => c.name).join(", ")}</p>
          )}
        </div>
        <Link href="/workspace" className="mt-3 inline-block text-sm underline">Semua percakapan</Link>
      </aside>

      <section className="mt-6 flex-1 lg:mt-0">
        <FormError message={searchParams.error} />
        <div className="space-y-3">
          {(messages ?? []).length === 0 && (
            <p className="rounded border p-4 text-sm text-gray-600">
              Tulis pesan pertama — mis. “Buatkan soal IPA kelas 5 tentang ekosistem”.
            </p>
          )}
          {(messages ?? []).map((m) => (
            <div key={m.id} className={`rounded border p-3 ${m.role === "user" ? "bg-gray-50" : ""}`}>
              <p className="text-xs font-semibold uppercase text-gray-500">{m.role === "user" ? "Anda" : "AI"}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{m.content}</p>
              {m.role === "assistant" && (
                <form action={saveAsMaterial.bind(null, m.id)} className="mt-2">
                  <button type="submit" className="rounded border px-2 py-1 text-xs">Simpan sebagai materi</button>
                </form>
              )}
            </div>
          ))}
        </div>

        {proposed.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="font-medium">Usulan aksi (menunggu persetujuan)</p>
            {proposed.map((a) => (
              <div key={a.id} className="rounded border border-blue-300 p-3">
                <p className="text-sm font-medium">{TYPE_LABEL[a.type as string] ?? (a.type as string)} · risiko {a.risk}</p>
                <dl className="mt-1 space-y-0.5 text-sm">
                  {Object.entries((a.payload ?? {}) as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="w-28 shrink-0 text-gray-500">{k}</dt>
                      <dd>{String(v ?? "-")}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-2 flex gap-2">
                  <form action={confirmAction.bind(null, a.id)}>
                    <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Setujui & Simpan</button>
                  </form>
                  <form action={rejectAction.bind(null, a.id)}>
                    <button type="submit" className="rounded border px-3 py-1 text-sm">Tolak</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {executed.length > 0 && (
          <div className="mt-4 rounded border p-3 text-sm">
            <p className="font-medium">Aksi tersimpan</p>
            <ul className="mt-1 space-y-1">
              {executed.map((a) => {
                const r = (a.result ?? {}) as { entityLabel?: string; href?: string };
                return (
                  <li key={a.id}>
                    {r.entityLabel ?? (a.type as string)}
                    {r.href && <Link href={r.href} className="ml-2 underline">Buka hasil</Link>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <form action={sendTo} className="mt-4 flex gap-2">
          <input name="content" required placeholder="Tulis pesan..." aria-label="Pesan untuk AI"
            className={inputCls} autoComplete="off" />
          <button type="submit" className="shrink-0 rounded bg-black px-4 py-2 text-sm text-white">Kirim</button>
        </form>
      </section>
    </main>
  );
}
