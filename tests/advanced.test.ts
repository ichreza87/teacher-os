import { describe, expect, it } from "vitest";
import { canTransition, renderTemplate, waLink } from "@/modules/communication/helpers";
import { computeSuggestions } from "@/modules/school/workflows";

describe("log transitions", () => {
  it("allows draft → approved/cancelled only", () => {
    expect(canTransition("draft", "approved")).toBe(true);
    expect(canTransition("draft", "cancelled")).toBe(true);
    expect(canTransition("draft", "sent")).toBe(false);
  });

  it("allows approved → sent/cancelled only", () => {
    expect(canTransition("approved", "sent")).toBe(true);
    expect(canTransition("sent", "approved")).toBe(false);
    expect(canTransition("cancelled", "draft")).toBe(false);
  });
});

describe("template rendering", () => {
  it("replaces known placeholders", () => {
    const r = renderTemplate("Halo {{nama_siswa}}, nilai {{tanggal}}.", {
      nama_siswa: "Ani",
      tanggal: "1 Okt",
    });
    expect(r.text).toBe("Halo Ani, nilai 1 Okt.");
    expect(r.missing).toEqual([]);
  });

  it("reports missing and unknown placeholders", () => {
    const r = renderTemplate("Halo {{nama_siswa}} {{nama_kucing}}.", { nama_siswa: "Ani" });
    expect(r.missing).toContain("nama_kucing");
    expect(r.text).toContain("{{nama_kucing}}");
  });
});

describe("wa link", () => {
  it("normalizes 08 numbers to wa.me", () => {
    expect(waLink("0812-345-678", "Halo")).toBe("https://wa.me/62812345678?text=Halo");
  });

  it("returns null for unusable numbers", () => {
    expect(waLink(null, "x")).toBeNull();
    expect(waLink("123", "x")).toBeNull();
    expect(waLink("", "x")).toBeNull();
  });
});

describe("workflow suggestions", () => {  it("emits suggestions only for enabled triggers", () => {
    const out = computeSuggestions({
      plansWithoutAssessment: [{ id: "p1", topic: "Ekosistem" }],
      fullyGradedAssessments: [{ id: "a1", title: "UH 1" }],
      overdueTasks: [{ id: "t1", title: "Periksa", due_on: "2026-01-01" }],
      enabled: ["task_overdue"],
    });
    expect(out).toHaveLength(1);
    expect(out[0].trigger).toBe("task_overdue");
    expect(out[0].href).toBe("/tasks");
  });

  it("caps at 5 per trigger", () => {
    const out = computeSuggestions({
      plansWithoutAssessment: Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, topic: `T${i}` })),
      fullyGradedAssessments: [],
      overdueTasks: [],
      enabled: ["lesson_plan_without_assessment"],
    });
    expect(out).toHaveLength(5);
  });
});
