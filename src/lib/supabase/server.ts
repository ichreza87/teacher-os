import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabase } from "@/lib/env";

/** Server-side Supabase client (anon key, RLS enforced, cookie session). */
export function createClient() {
  const { url, anonKey } = requireSupabase();
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component: session refresh happens in middleware.
        }
      },
    },
  });
}
