import { createBrowserClient } from "@supabase/ssr";
import { requireSupabase } from "@/lib/env";

/** Browser-side Supabase client (anon key, RLS enforced). */
export function createClient() {
  const { url, anonKey } = requireSupabase({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return createBrowserClient(url, anonKey);
}
