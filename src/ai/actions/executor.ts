import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { validateActionPayload, type ActionType } from "./schemas";

export interface ExecutionResult {
  entityLabel: string;
  href: string;
}

/** Execute a validated, user-confirmed action. Ownership is re-checked here
 *  (defense in depth: RLS + explicit school scoping). */
export async function executeAction(
  supabase: SupabaseClient,
  schoolCtx: { userId: string; teacherId: string; schoolId: string },
  type: string,
  payload: unknown
): Promise<ExecutionResult> {
  const v = validateActionPayload(type, payload);
  if (!v.ok) throw new Error(v.error);
  const t: ActionType = v.type;
  const p = v.payload as Record<string, unknown>;
  const { userId, teacherId, schoolId } = schoolCtx;

  switch (t) {
    case "create_lesson_plan": {
      const classId = (p.classId as string) || null;
      if (classId) await assertClass(supabase, schoolId, classId);
      const { data, error } = await supabase
        .from("lesson_plans")
        .insert({
          school_id: schoolId, teacher_id: teacherId, class_id: classId,
          subject: p.subject, topic: p.topic,
          grade: (p.grade as string) || null,
          objectives: (p.objectives as string) || null,
          status: "draft", created_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Gagal membuat modul.");
      await audit(supabase, userId, "ai_created", "lesson_plan", data.id as string);
      return { entityLabel: `Modul "${p.topic}"`, href: `/planning/${data.id}` };
    }
    case "create_assessment": {
      await assertClass(supabase, schoolId, p.classId as string);
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          school_id: schoolId, teacher_id: teacherId, class_id: p.classId,
          title: p.title, kind: p.kind ?? "formatif",
          max_score: (p.maxScore as number) ?? 100, created_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Gagal membuat asesmen.");
      await audit(supabase, userId, "ai_created", "assessment", data.id as string);
      return { entityLabel: `Asesmen "${p.title}"`, href: `/assessments/${data.id}` };
    }
    case "create_material": {
      const { data, error } = await supabase
        .from("materials")
        .insert({
          school_id: schoolId, teacher_id: teacherId,
          title: p.title, kind: (p.kind as string) ?? "dokumen",
          body: (p.body as string) || null, created_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Gagal membuat materi.");
      await audit(supabase, userId, "ai_created", "material", data.id as string);
      return { entityLabel: `Materi "${p.title}"`, href: "/materials" };
    }
    case "create_task": {
      const { error } = await supabase.from("tasks").insert({
        owner_user_id: userId, title: p.title,
        due_on: (p.dueOn as string) || null,
      });
      if (error) throw new Error(error.message);
      await audit(supabase, userId, "ai_created", "task", null);
      return { entityLabel: `Tugas "${p.title}"`, href: "/tasks" };
    }
    case "create_event": {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          school_id: schoolId, teacher_id: teacherId,
          title: p.title, starts_at: p.startsAt,
          kind: (p.kind as string) ?? "akademik", created_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Gagal membuat agenda.");
      await audit(supabase, userId, "ai_created", "calendar_event", data.id as string);
      return { entityLabel: `Agenda "${p.title}"`, href: "/calendar" };
    }
  }
}

async function assertClass(supabase: SupabaseClient, schoolId: string, classId: string): Promise<void> {
  const { data } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!data) throw new Error("Kelas di luar sekolah Anda — aksi ditolak.");
}

async function audit(
  supabase: SupabaseClient, actorId: string, action: string, entity: string, entityId: string | null
): Promise<void> {
  await supabase.from("audit_logs").insert({
    actor_id: actorId, action, entity_type: entity, entity_id: entityId,
    metadata: { via: "ai_workspace" },
  });
}

/** Pure helper for tests: SHA-256 dedup hash used for questions. */
export function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}
