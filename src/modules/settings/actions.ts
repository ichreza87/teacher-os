"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { AI_PROVIDER_NAMES } from "@/ai/providers/registry";

export async function saveAISettings(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) redirect(`/settings/ai?error=${encodeURIComponent(res.message)}`);
  const { supabase, teacherId } = res.ctx;

  const provider = String(formData.get("provider") ?? "mock");
  if (!(AI_PROVIDER_NAMES as readonly string[]).includes(provider)) {
    redirect("/settings/ai?error=Provider tidak dikenal.");
  }
  const model = String(formData.get("model") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const embedModel = String(formData.get("embedModel") ?? "").trim();
  if (provider === "openai_compat") {
    if (!model) redirect("/settings/ai?error=Model wajib diisi untuk OpenAI-compatible.");
    if (baseUrl) {
      try {
        new URL(baseUrl);
      } catch {
        redirect("/settings/ai?error=Base URL tidak valid.");
      }
    }
  }

  if (embedModel.length > 100) redirect("/settings/ai?error=Model embedding terlalu panjang.");

  const { error } = await supabase.from("teacher_settings").upsert(
    {
      teacher_id: teacherId,
      ai_provider: provider,
      ai_model: model || null,
      ai_base_url: baseUrl || null,
      ai_embed_model: embedModel || null,
    },
    { onConflict: "teacher_id" }
  );
  if (error) redirect(`/settings/ai?error=${encodeURIComponent(error.message)}`);
  redirect("/settings/ai?saved=1");
}
