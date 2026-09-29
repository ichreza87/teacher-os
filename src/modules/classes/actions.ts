"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSchoolContext } from "@/lib/school";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const classSchema = z.object({
  name: z.string().trim().min(1, "Nama kelas wajib diisi"),
  grade: z.string().trim().optional().or(z.literal("")),
  academicYearId: z.string().uuid("Tahun ajaran tidak valid").optional().or(z.literal("")),
  homeroomTeacherId: z.string().uuid("Wali kelas tidak valid").optional().or(z.literal("")),
});

export async function createClass(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/classes", res.message);
  const { supabase, schoolId, userId } = res.ctx;

  const parsed = classSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    grade: String(formData.get("grade") ?? "").trim(),
    academicYearId: String(formData.get("academicYearId") ?? "").trim(),
    homeroomTeacherId: String(formData.get("homeroomTeacherId") ?? "").trim(),
  });
  if (!parsed.success) fail("/classes", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { error } = await supabase.from("classes").insert({
    school_id: schoolId,
    academic_year_id: d.academicYearId || null,
    grade: d.grade || null,
    name: d.name,
    homeroom_teacher_id: d.homeroomTeacherId || null,
    created_by: userId,
  });
  if (error) fail("/classes", error.message);
  redirect("/classes");
}

export async function enrollStudent(classId: string, formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(`/classes/${classId}`, res.message);
  const { supabase, schoolId } = res.ctx;

  const studentId = String(formData.get("studentId") ?? "");
  const { data: cls } = await supabase
    .from("classes")
    .select("id, academic_year_id")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!cls) fail(`/classes/${classId}`, "Kelas tidak ditemukan.");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!student) fail(`/classes/${classId}`, "Siswa tidak ditemukan.");

  const { error } = await supabase.from("enrollments").upsert(
    {
      student_id: studentId,
      class_id: classId,
      academic_year_id: cls.academic_year_id,
      status: "aktif",
    },
    { onConflict: "student_id,academic_year_id" }
  );
  if (error) fail(`/classes/${classId}`, error.message);
  redirect(`/classes/${classId}`);
}
