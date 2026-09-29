import type { SupabaseClient } from "@supabase/supabase-js";
import type { AIProvider } from "./types";
import { MockProvider } from "./mock";
import { OpenAICompatProvider } from "./openai-compat";

export const AI_PROVIDER_NAMES = ["mock", "openai_compat"] as const;
export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number];

/** Anthropic/Gemini native providers are planned but not implemented;
 *  the settings UI only offers providers listed in AI_PROVIDER_NAMES. */

export interface ProviderSettings {
  provider: AIProviderName;
  model?: string | null;
  baseUrl?: string | null;
  embedModel?: string | null;
}

/** Server-side factory. Throws honest errors for missing config. */
export function createProvider(settings: ProviderSettings): AIProvider {
  if (settings.provider === "mock") return new MockProvider();
  if (settings.provider === "openai_compat") {
    return new OpenAICompatProvider({
      apiKey: process.env.AI_API_KEY ?? "",
      model: settings.model ?? "",
      baseUrl: settings.baseUrl ?? undefined,
    });
  }
  throw new Error(`Provider AI tidak dikenal: ${settings.provider satisfies never}.`);
}

export async function loadProviderSettings(
  supabase: SupabaseClient,
  teacherId: string
): Promise<ProviderSettings> {
  const { data } = await supabase.from("teacher_settings").select("ai_provider, ai_model, ai_base_url, ai_embed_model").eq("teacher_id", teacherId).maybeSingle();
  const row = data as { ai_provider: string; ai_model: string | null; ai_base_url: string | null; ai_embed_model: string | null } | null;
  const provider = row?.ai_provider === "openai_compat" ? "openai_compat" : "mock";
  return { provider, model: row?.ai_model, baseUrl: row?.ai_base_url, embedModel: row?.ai_embed_model };
}
