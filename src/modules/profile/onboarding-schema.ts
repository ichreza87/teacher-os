import { z } from "zod";
import { getLevelCodes } from "@/config/levels";

export const TEACHER_ROLES = [
  "guru_kelas",
  "guru_mapel",
  "guru_bk",
  "guru_pendamping",
  "wali_kelas",
] as const;

/** 8-step onboarding, one schema per step so each step validates independently. */
export const onboardingStepSchemas = {
  1: z.object({ fullName: z.string().trim().min(2, "Nama minimal 2 karakter") }),
  2: z.object({ level: z.enum(getLevelCodes() as [string, ...string[]]) }),
  3: z.object({ schoolName: z.string().trim().min(2, "Nama sekolah minimal 2 karakter") }),
  4: z.object({
    subject: z.string().trim().min(1, "Mata pelajaran/peran wajib diisi"),
    role: z.enum(TEACHER_ROLES),
  }),
  5: z.object({ className: z.string().trim().min(1, "Kelas wajib diisi").optional().or(z.literal("")) }),
  6: z.object({ curriculum: z.string().trim().min(1, "Kurikulum wajib diisi") }),
  7: z.object({ academicYear: z.string().regex(/^\d{4}\/\d{4}$/, "Format: 2026/2027") }),
  8: z.object({ aiProvider: z.enum(["mock", "openai", "anthropic", "gemini", "local"]) }),
} as const;

export type OnboardingStep = keyof typeof onboardingStepSchemas;

export const onboardingSchema = z.object({
  fullName: onboardingStepSchemas[1].shape.fullName,
  level: onboardingStepSchemas[2].shape.level,
  schoolName: onboardingStepSchemas[3].shape.schoolName,
  subject: onboardingStepSchemas[4].shape.subject,
  role: onboardingStepSchemas[4].shape.role,
  className: z.string().optional().or(z.literal("")),
  curriculum: onboardingStepSchemas[6].shape.curriculum,
  academicYear: onboardingStepSchemas[7].shape.academicYear,
  aiProvider: onboardingStepSchemas[8].shape.aiProvider,
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

export function validateStep(step: OnboardingStep, data: unknown) {
  return onboardingStepSchemas[step].safeParse(data);
}
