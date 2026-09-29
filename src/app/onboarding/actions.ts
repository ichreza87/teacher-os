"use server";

import { onboardingSchema } from "@/modules/profile/onboarding-schema";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";

/** Persist onboarding result: profile + school + teacher + academic year + audit. */
export async function completeOnboarding(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Data onboarding tidak valid." };
  }
  const data = parsed.data;

  let supabase;
  try {
    supabase = createClient();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Supabase belum dikonfigurasi." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Masuk kembali lalu ulangi." };

  // profile upsert
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: data.fullName }, { onConflict: "id" });
  if (profileError) return { ok: false, error: profileError.message };

  // reuse school already linked to this user, else create
  let schoolId: string | null = null;
  const { data: existingTeacher } = await supabase
    .from("teachers")
    .select("id, school_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existingTeacher?.school_id) {
    schoolId = existingTeacher.school_id;
  } else {
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({ name: data.schoolName, created_by: user.id })
      .select("id")
      .single();
    if (schoolError || !school) return { ok: false, error: schoolError?.message ?? "Gagal membuat sekolah." };
    schoolId = school.id;
  }

  // teacher upsert (claim or create)
  if (existingTeacher) {
    const { error } = await supabase
      .from("teachers")
      .update({
        school_id: schoolId,
        education_level_code: data.level,
        subject: data.subject,
        role: data.role,
      })
      .eq("id", existingTeacher.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: teacher, error } = await supabase
      .from("teachers")
      .insert({
        user_id: user.id,
        school_id: schoolId,
        education_level_code: data.level,
        subject: data.subject,
        role: data.role,
      })
      .select("id")
      .single();
    if (error || !teacher) return { ok: false, error: error?.message ?? "Gagal membuat data guru." };
    const { error: linkError } = await supabase
      .from("teacher_schools")
      .upsert({ teacher_id: teacher.id, school_id: schoolId, is_primary: true }, { onConflict: "teacher_id,school_id" });
    if (linkError) return { ok: false, error: linkError.message };
  }

  // academic year (one active per school)
  await supabase.from("academic_years").update({ is_active: false }).eq("school_id", schoolId);
  const { error: yearError } = await supabase.from("academic_years").upsert(
    { school_id: schoolId, name: data.academicYear, is_active: true },
    { onConflict: "school_id,name" }
  );
  if (yearError) return { ok: false, error: yearError.message };

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "onboarding_completed",
    entity_type: "teacher",
    metadata: { level: data.level, curriculum: data.curriculum, ai_provider: data.aiProvider },
  });

  track(user.id, "onboarding_completed", { level: data.level, curriculum: data.curriculum });

  return { ok: true };
}
