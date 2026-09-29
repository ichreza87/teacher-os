"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { eventSchema } from "@/modules/teaching/schemas";

function fail(message: string): never {
  redirect(`/calendar?error=${encodeURIComponent(message)}`);
}

export async function createEvent(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(res.message);
  const { supabase, userId, teacherId, schoolId } = res.ctx;

  const parsed = eventSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? "").trim(),
    kind: String(formData.get("kind") ?? ""),
    classId: String(formData.get("classId") ?? "").trim(),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const startsAt = new Date(d.startsAt);
  if (Number.isNaN(startsAt.getTime())) fail("Waktu mulai tidak valid.");
  let endsAt: Date | null = null;
  if (d.endsAt) {
    endsAt = new Date(d.endsAt);
    if (Number.isNaN(endsAt.getTime())) fail("Waktu selesai tidak valid.");
    if (endsAt <= startsAt) fail("Waktu selesai harus setelah waktu mulai.");
  }
  if (d.classId) {
    const { data: cls } = await supabase.from("classes").select("id").eq("id", d.classId).eq("school_id", schoolId).maybeSingle();
    if (!cls) fail("Kelas tidak ditemukan.");
  }

  const { error } = await supabase.from("calendar_events").insert({
    school_id: schoolId,
    teacher_id: teacherId,
    class_id: d.classId || null,
    title: d.title,
    description: d.description || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt ? endsAt.toISOString() : null,
    kind: d.kind,
    created_by: userId,
  });
  if (error) fail(error.message);
  redirect("/calendar");
}
