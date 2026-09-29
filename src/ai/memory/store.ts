import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/ai/providers/types";

/**
 * Conversation memory policy:
 * - Full history is stored (audit + continuity).
 * - Only the last HISTORY_LIMIT messages are sent to the provider (cost + focus).
 * - Nothing is promoted to permanent memory without explicit user action.
 * - PII minimization: history is scoped to the owner's conversation (RLS).
 */
export const HISTORY_LIMIT = 20;

export async function getHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit = HISTORY_LIMIT
): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []).reverse() as ChatMessage[]).filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
}

export async function appendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role, content });
  if (error) throw new Error(error.message);
}
