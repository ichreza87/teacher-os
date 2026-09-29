import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { AI_PROVIDER_NAMES } from "@/ai/providers/registry";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { saveAISettings } from "@/modules/settings/actions";

export default async function AISettingsPage({ searchParams }: { searchParams: { error?: string; saved?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">AI Settings</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { data: settings } = await res.ctx.supabase
    .from("teacher_settings")
    .select("ai_provider, ai_model, ai_base_url, ai_embed_model")
    .eq("teacher_id", res.ctx.teacherId)
    .maybeSingle();

  const keyConfigured = Boolean(process.env.AI_API_KEY);

  return (
    <main className="max-w-xl p-8">
      <h1 className="text-2xl font-semibold">AI Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Kunci API hanya dibaca dari server env (<code>AI_API_KEY</code>) dan tidak pernah disimpan di database.
        Status kunci server: <strong>{keyConfigured ? "terisi" : "belum diisi"}</strong>.
      </p>
      {searchParams.saved && <p role="status" className="mt-3 rounded border border-green-300 bg-green-50 p-3 text-sm">Pengaturan tersimpan.</p>}
      <form action={saveAISettings} className="mt-4 space-y-3">
        <FormError message={searchParams.error} />
        <Field label="Provider" htmlFor="provider">
          <select id="provider" name="provider" className={inputCls} defaultValue={settings?.ai_provider ?? "mock"}>
            {AI_PROVIDER_NAMES.map((p) => (
              <option key={p} value={p}>{p === "mock" ? "Mock (offline, tanpa key)" : "OpenAI-compatible (HTTP)"}</option>
            ))}
          </select>
        </Field>
        <Field label="Model (wajib untuk OpenAI-compatible)" htmlFor="model" hint="cth. gpt-4o-mini, atau nama model lokal.">
          <input id="model" name="model" defaultValue={settings?.ai_model ?? ""} className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Base URL (opsional)" htmlFor="baseUrl" hint="Kosongkan untuk api.openai.com. Isi untuk endpoint lokal yang kompatibel OpenAI.">
          <input id="baseUrl" name="baseUrl" defaultValue={settings?.ai_base_url ?? ""} placeholder="https://api.openai.com/v1"
            className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Model embedding (opsional)" htmlFor="embedModel" hint="Default text-embedding-3-small. Mock mengabaikan isian ini.">
          <input id="embedModel" name="embedModel" defaultValue={settings?.ai_embed_model ?? ""} className={inputCls} autoComplete="off" />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Simpan</button>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        Provider native Anthropic/Gemini direncanakan berikutnya; saat ini gunakan endpoint yang kompatibel OpenAI.
      </p>
    </main>
  );
}
