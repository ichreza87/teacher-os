import { describe, expect, it } from "vitest";
import { getLevelCodes, getLevelConfig } from "@/config/levels";

describe("education level config", () => {
  it("covers all six levels", () => {
    expect(getLevelCodes()).toEqual(["PAUD", "TK", "SD", "SMP", "SMA", "SMK"]);
  });

  it("returns terminology per level without branching in callers", () => {
    expect(getLevelConfig("PAUD").terminology.classUnit).toBe("kelompok");
    expect(getLevelConfig("SD").terminology.lessonPlan).toBe("modul ajar");
    expect(getLevelConfig("SMK").assessmentTypes).toContain("uji kompetensi");
  });

  it("throws on unknown level", () => {
    expect(() => getLevelConfig("UNIV")).toThrow();
  });
});
