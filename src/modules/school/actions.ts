"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSchoolContext } from "@/lib/school";
import type { Trigger } from "./workflows";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const DOC_KINDS = ["policy", "meeting", "inventory", "announcement", "other"] as const;
const TRIGGERS: Trigger[] = ["lesson_plan_without_assessment", "assessment_fully_graded", "task_overdue"];

const docSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  kind: z.enum(DOC_KINDS),
  body: z.string().trim().optional().or(z.literal("")),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional().or(z.literal("")),
});

export async function createSchoolDocument(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/school", res.message);
  const { supabase, userId, schoolId } = res.ctx;
  const parsed = docSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? "").trim(),
    eventDate: String(formData.get("eventDate") ?? "").trim(),
  });
  if (!parsed.success) fail("/school", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;
  const { error } = await supabase.from("school_documents").insert({
    school_id: schoolId,
    title: d.title,
    kind: d.kind,
    body: d.body || null,
    event_date: d.eventDate || null,
    created_by: userId,
  });
  if (error) fail("/school", error.message);
  redirect("/school");
}

export async function toggleRule(formData: FormData): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/school/workflows", res.message);
  const { supabase, userId, schoolId } = res.ctx;
  const trigger = String(formData.get("trigger") ?? "");
  if (!(TRIGGERS as string[]).includes(trigger)) fail("/school/workflows", "Trigger tidak dikenal.");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  const { error } = await supabase.from("workflow_rules").upsert(
    { school_id: schoolId, trigger, enabled, created_by: userId },
    { onConflict: "school_id,trigger" }
  );
  if (error) fail("/school/workflows", error.message);
  redirect("/school/workflows");
}

export async function markRun(ruleId: string, entityType: string, entityId: string, status: "applied" | "dismissed"): Promise<never> {
  const res = await getSchoolContext();
  if (!res.ok) fail("/school/workflows", res.message);
  const { supabase, schoolId } = res.ctx;
  const { data: rule } = await supabase.from("workflow_rules").select("id").eq("id", ruleId).eq("school_id", schoolId).maybeSingle();
  if (!rule) fail("/school/workflows", "Aturan tidak ditemukan.");
  const { error } = await supabase.from("workflow_runs").upsert(
    { rule_id: ruleId, entity_type: entityType, entity_id: entityId || null, status },
    { onConflict: "rule_id,entity_type,entity_id" }
  );
  if (error) fail("/school/workflows", error.message);
  redirect("/school/workflows");
}
