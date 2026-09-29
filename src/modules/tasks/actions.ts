"use server";

import { redirect } from "next/navigation";
import { getSchoolContext } from "@/lib/school";
import { TASK_STATUSES, taskSchema } from "@/modules/teaching/schemas";

function fail(message: string): never {
  redirect(`/tasks?error=${encodeURIComponent(message)}`);
}

export async function createTask(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(res.message);
  const { supabase, userId } = res.ctx;

  const parsed = taskSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    dueOn: String(formData.get("dueOn") ?? "").trim(),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;

  const { error } = await supabase.from("tasks").insert({
    owner_user_id: userId,
    title: d.title,
    description: d.description || null,
    due_on: d.dueOn || null,
  });
  if (error) fail(error.message);
  redirect("/tasks");
}

export async function cycleTask(taskId: string): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(res.message);
  const { supabase, userId } = res.ctx;

  const { data: task } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!task) fail("Tugas tidak ditemukan.");

  const order = [...TASK_STATUSES];
  const next = order[(order.indexOf(task.status as (typeof order)[number]) + 1) % order.length];
  const { error } = await supabase.from("tasks").update({ status: next }).eq("id", taskId);
  if (error) fail(error.message);
  redirect("/tasks");
}

export async function deleteTask(taskId: string, formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail(res.message);
  const { supabase, userId } = res.ctx;

  // Human-in-the-loop: require explicit confirmation checkbox.
  if (String(formData.get("confirm") ?? "") !== "ya") fail("Centang konfirmasi hapus terlebih dahulu.");
  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("owner_user_id", userId);
  if (error) fail(error.message);
  redirect("/tasks");
}
