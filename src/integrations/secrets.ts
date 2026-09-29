import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type IntegrationProvider = "s3" | "notion" | "google" | "posthog";

/** Non-secret integration rows + encrypted token storage. Server-side only. */

export async function getIntegration(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProvider
) {
  const { data } = await supabase
    .from("integrations")
    .select("id, status, config, error")
    .eq("owner_user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return data as { id: string; status: string; config: Record<string, unknown>; error: string | null } | null;
}

export async function getDecryptedToken(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  const integration = await getIntegration(supabase, userId, provider);
  if (!integration || integration.status !== "connected") return null;
  const { data: secret } = await supabase
    .from("integration_secrets")
    .select("ciphertext, iv")
    .eq("integration_id", integration.id)
    .maybeSingle();
  if (!secret) return null;
  try {
    return decryptSecret(secret as { ciphertext: string; iv: string });
  } catch {
    await supabase.from("integrations").update({ status: "error", error: "Token tidak bisa didekripsi (APP_ENCRYPTION_KEY berubah?)." }).eq("id", integration.id);
    return null;
  }
}

/** Upsert integration row + encrypted token. Token plaintext never leaves this function. */
export async function saveToken(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProvider,
  tokenPlaintext: string,
  config: Record<string, unknown> = {}
): Promise<void> {
  const sealed = encryptSecret(tokenPlaintext);
  const { data: integration, error } = await supabase
    .from("integrations")
    .upsert(
      { owner_user_id: userId, provider, status: "connected", config, error: null },
      { onConflict: "owner_user_id,provider" }
    )
    .select("id")
    .single();
  if (error || !integration) throw new Error(error?.message ?? "Gagal menyimpan integrasi.");
  const { error: sError } = await supabase.from("integration_secrets").upsert(
    { integration_id: (integration as { id: string }).id, ciphertext: sealed.ciphertext, iv: sealed.iv },
    { onConflict: "integration_id" }
  );
  if (sError) throw new Error(sError.message);
}

export async function disconnectProvider(
  supabase: SupabaseClient,
  userId: string,
  provider: IntegrationProvider
): Promise<void> {
  const integration = await getIntegration(supabase, userId, provider);
  if (!integration) return;
  // Deleting the integration cascades to integration_secrets.
  const { error } = await supabase.from("integrations").delete().eq("id", integration.id);
  if (error) throw new Error(error.message);
}
