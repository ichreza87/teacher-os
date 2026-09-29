import { describe, expect, it } from "vitest";
import {
  assessmentSchema,
  eventSchema,
  lessonPlanSchema,
  materialSchema,
  parentSchema,
  questionSchema,
  studentSchema,
  taskSchema,
} from "@/modules/teaching/schemas";

describe("teaching schemas", () => {
  it("accepts a minimal student", () => {
    expect(studentSchema.safeParse({ fullName: "Siswa Contoh" }).success).toBe(true);
  });

  it("rejects non-numeric NISN", () => {
    expect(studentSchema.safeParse({ fullName: "Siswa", nisn: "abc" }).success).toBe(false);
  });

  it("accepts a parent with relation", () => {
    expect(parentSchema.safeParse({ relation: "wali", fullName: "Wali Contoh" }).success).toBe(true);
  });

  it("rejects lesson plan without topic", () => {
    expect(lessonPlanSchema.safeParse({ subject: "IPA", topic: "" }).success).toBe(false);
  });

  it("rejects material with bad URL", () => {
    expect(materialSchema.safeParse({ title: "Materi", kind: "video", url: "bukan-url" }).success).toBe(false);
  });

  it("rejects question with short content", () => {
    expect(
      questionSchema.safeParse({
        bankId: "11111111-1111-4111-8111-111111111111",
        questionType: "essay",
        difficulty: "sedang",
        content: "Apa",
      }).success
    ).toBe(false);
  });

  it("requires class on assessment", () => {
    expect(assessmentSchema.safeParse({ title: "UH 1", kind: "sumatif", classId: "" }).success).toBe(false);
  });

  it("rejects task without title", () => {
    expect(taskSchema.safeParse({ title: " " }).success).toBe(false);
  });

  it("requires start time on event", () => {
    expect(eventSchema.safeParse({ title: "Rapat", startsAt: "", kind: "rapat" }).success).toBe(false);
  });
});
