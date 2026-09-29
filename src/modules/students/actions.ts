"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { parentSchema, studentSchema } from "@/modules/teaching/schemas";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const opt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? "" : s;
};

export async function createStudent(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/students/new", res.message);
  const { supabase, ctx } = { supabase: res.ctx.supabase, ctx: res.ctx };

  const parsed = studentSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    nisn: opt(formData.get("nisn")),
    gender: opt(formData.get("gender")),
    birthPlace: opt(formData.get("birthPlace")),
    birthDate: opt(formData.get("birthDate")),
    address: opt(formData.get("address")),
    phone: opt(formData.get("phone")),
  });
  if (!parsed.success) fail("/students/new", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { data, error } = await supabase
    .from("students")
    .insert({
      school_id: ctx.schoolId,
      full_name: d.fullName,
      nisn: d.nisn || null,
      gender: d.gender || null,
      birth_place: d.birthPlace || null,
      birth_date: d.birthDate || null,
      address: d.address || null,
      phone: d.phone || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !data) fail("/students/new", error?.message ?? "Gagal menyimpan siswa.");
  redirect(`/students/${data.id}`);
}

export async function addParent(studentId: string, formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(`/students/${studentId}`, res.message);
  const { supabase, schoolId } = { supabase: res.ctx.supabase, schoolId: res.ctx.schoolId };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!student) fail(`/students/${studentId}`, "Siswa tidak ditemukan.");

  const parsed = parentSchema.safeParse({
    relation: String(formData.get("relation") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    phone: opt(formData.get("phone")),
    email: opt(formData.get("email")),
    occupation: opt(formData.get("occupation")),
  });
  if (!parsed.success) fail(`/students/${studentId}`, parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { error } = await supabase.from("parents").insert({
    student_id: studentId,
    relation: d.relation,
    full_name: d.fullName,
    phone: d.phone || null,
    email: d.email || null,
    occupation: d.occupation || null,
  });
  if (error) fail(`/students/${studentId}`, error.message);
  redirect(`/students/${studentId}`);
}
