import { z } from "zod";

export const ACTION_TYPES = [
  "create_lesson_plan",
  "create_assessment",
  "create_material",
  "create_task",
  "create_event",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Payload schemas: every proposed action is validated against these before storage or execution. */
export const actionPayloadSchemas = {
  create_lesson_plan: z.object({
    subject: z.string().min(1),
    topic: z.string().min(2),
    grade: z.string().optional().or(z.literal("")),
    classId: z.string().uuid().optional().or(z.literal("")),
    objectives: z.string().optional().or(z.literal("")),
  }),
  create_assessment: z.object({
    title: z.string().min(2),
    classId: z.string().uuid(),
    kind: z.enum(["formatif", "sumatif", "proyek", "praktik", "observasi", "uji_kompetensi"]).default("formatif"),
    maxScore: z.number().positive().default(100),
  }),
  create_material: z.object({
    title: z.string().min(2),
    kind: z.enum(["dokumen", "video", "tautan", "gambar", "presentasi", "lembar_kerja", "lainnya"]).default("dokumen"),
    body: z.string().optional().or(z.literal("")),
  }),
  create_task: z.object({
    title: z.string().min(2).max(200),
    dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  }),
  create_event: z.object({
    title: z.string().min(2),
    startsAt: z.string().datetime({ offset: true }),
    kind: z.enum(["akademik", "kbm", "asesmen", "rapat", "acara", "lainnya"]).default("akademik"),
  }),
} as const;

/** All Phase-3 creations are low risk (scoped, reversible). High risk is reserved
 *  for future ops: student data changes, deletes, outbound communication, grades bulk. */
export const ACTION_RISK: Record<ActionType, "low" | "high"> = {
  create_lesson_plan: "low",
  create_assessment: "low",
  create_material: "low",
  create_task: "low",
  create_event: "low",
};

export function validateActionPayload(type: string, payload: unknown):
  | { ok: true; type: ActionType; payload: unknown }
  | { ok: false; error: string } {
  if (!(ACTION_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: `Tipe aksi tidak dikenal: ${type}.` };
  }
  const t = type as ActionType;
  const r = actionPayloadSchemas[t].safeParse(payload);
  if (!r.success) return { ok: false, error: `Payload tidak valid: ${r.error.issues[0]?.message}` };
  return { ok: true, type: t, payload: r.data };
}
