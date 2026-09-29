/** Configuration-driven education levels (PAUD..SMK).
 *  No `if (level === "SD")` scattered in app code: use getLevelConfig(). */

export interface LevelConfig {
  code: string;
  name: string;
  /** Terminology overrides, e.g. PAUD uses "kelompok" instead of "kelas". */
  terminology: {
    classUnit: string;
    teacher: string;
    lessonPlan: string;
    assessment: string;
  };
  /** Assessment types available for this level. */
  assessmentTypes: string[];
}

const LEVELS: LevelConfig[] = [
  {
    code: "PAUD",
    name: "PAUD",
    terminology: { classUnit: "kelompok", teacher: "pendidik", lessonPlan: "RPPH", assessment: "asesmen observasi" },
    assessmentTypes: ["observasi", "anekdot", "portofolio"],
  },
  {
    code: "TK",
    name: "TK",
    terminology: { classUnit: "kelompok", teacher: "guru", lessonPlan: "RPPH", assessment: "asesmen observasi" },
    assessmentTypes: ["observasi", "anekdot", "portofolio"],
  },
  {
    code: "SD",
    name: "SD",
    terminology: { classUnit: "kelas", teacher: "guru", lessonPlan: "modul ajar", assessment: "asesmen" },
    assessmentTypes: ["formatif", "sumatif", "observasi", "proyek"],
  },
  {
    code: "SMP",
    name: "SMP",
    terminology: { classUnit: "kelas", teacher: "guru", lessonPlan: "modul ajar", assessment: "asesmen" },
    assessmentTypes: ["formatif", "sumatif", "proyek", "praktik"],
  },
  {
    code: "SMA",
    name: "SMA",
    terminology: { classUnit: "kelas", teacher: "guru", lessonPlan: "modul ajar", assessment: "asesmen" },
    assessmentTypes: ["formatif", "sumatif", "proyek", "praktik"],
  },
  {
    code: "SMK",
    name: "SMK",
    terminology: { classUnit: "kelas", teacher: "guru", lessonPlan: "modul ajar", assessment: "asesmen" },
    assessmentTypes: ["formatif", "sumatif", "praktik", "uji kompetensi"],
  },
];

export function getLevelCodes(): string[] {
  return LEVELS.map((l) => l.code);
}

export function getLevelConfig(code: string): LevelConfig {
  const found = LEVELS.find((l) => l.code === code);
  if (!found) throw new Error(`Unknown education level: ${code}`);
  return found;
}
