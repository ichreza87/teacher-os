"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSchoolContext } from "@/lib/school";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const PD_KINDS = ["course", "training", "certification", "workshop", "reading", "achievement"] as const;

const pdSchema = z.object({
  kind: z.enum(PD_KINDS),
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  provider: z.string().trim().optional().or(z.literal("")),
  heldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional().or(z.literal("")),
  hours: z.coerce.number().nonnegative("Jam tidak boleh negatif").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export async function createPD(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/professional", res.message);
  const { supabase, teacherId } = res.ctx;
  const parsed = pdSchema.safeParse({
    kind: String(formData.get("kind") ?? ""),
    title: String(formData.get("title") ?? ""),
    provider: String(formData.get("provider") ?? "").trim(),
    heldOn: String(formData.get("heldOn") ?? "").trim(),
    hours: String(formData.get("hours") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  if (!parsed.success) fail("/professional", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;
  const { error } = await supabase.from("professional_development").insert({
    teacher_id: teacherId,
    kind: d.kind,
    title: d.title,
    provider: d.provider || null,
    held_on: d.heldOn || null,
    hours: d.hours === "" || d.hours === undefined ? null : d.hours,
    notes: d.notes || null,
  });
  if (error) fail("/professional", error.message);
  redirect("/professional");
}
