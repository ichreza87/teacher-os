import { describe, expect, it } from "vitest";
import { onboardingSchema, validateStep } from "@/modules/profile/onboarding-schema";

describe("onboarding schema", () => {
  it("accepts a complete valid payload", () => {
    const r = onboardingSchema.safeParse({
      fullName: "Ibu Guru",
      level: "SD",
      schoolName: "SD Contoh",
      subject: "Matematika",
      role: "guru_mapel",
      className: "5A",
      curriculum: "Merdeka",
      academicYear: "2026/2027",
      aiProvider: "mock",
    });
    expect(r.success).toBe(true);
  });

  it("rejects bad academic year format", () => {
    const r = validateStep(7, { academicYear: "2026" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown level", () => {
    const r = validateStep(2, { level: "UNIV" });
    expect(r.success).toBe(false);
  });

  it("rejects empty name", () => {
    const r = validateStep(1, { fullName: " " });
    expect(r.success).toBe(false);
  });
});
