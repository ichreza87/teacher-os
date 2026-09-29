import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth-domains";

export interface SchoolContext {
  supabase: SupabaseClient;
  userId: string;
  teacherId: string;
  schoolId: string;
}

export type ContextError = "setup" | "login" | "onboarding";

/** Resolve the current teacher + school for pages and server actions.
 *  Returns a discriminated result so callers render honest states. */
export async function getSchoolContext(): Promise<
  { ok: true; ctx: SchoolContext } | { ok: false; reason: ContextError; message: string }
> {
  let supabase: SupabaseClient;
  try {
    supabase = createClient();
  } catch {
    return { ok: false, reason: "setup", message: "Supabase belum dikonfigurasi." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "login", message: "Sesi berakhir. Masuk kembali." };
  if (!isAllowedEmail(user.email ?? "")) {
    return { ok: false, reason: "login", message: "Akun harus Belajar.id. Keluar lalu masuk dengan akun Belajar.id." };
  }
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, school_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!teacher?.school_id) {
    return { ok: false, reason: "onboarding", message: "Lengkapi onboarding untuk membentuk konteks mengajar." };
  }
  return {
    ok: true,
    ctx: { supabase, userId: user.id, teacherId: teacher.id as string, schoolId: teacher.school_id as string },
  };
}
