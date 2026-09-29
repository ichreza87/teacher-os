import { z } from "zod";

export const studentSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter"),
  nisn: z.string().trim().regex(/^\d*$/, "NISN hanya angka").optional().or(z.literal("")),
  gender: z.enum(["L", "P"]).optional().or(z.literal("")),
  birthPlace: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
});

export const parentSchema = z.object({
  relation: z.enum(["ayah", "ibu", "wali"]),
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")),
  occupation: z.string().trim().optional().or(z.literal("")),
});

export const lessonPlanSchema = z.object({
  subject: z.string().trim().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().trim().optional().or(z.literal("")),
  topic: z.string().trim().min(2, "Topik minimal 2 karakter"),
  objectives: z.string().trim().optional().or(z.literal("")),
  activities: z.string().trim().optional().or(z.literal("")),
  durationMeetings: z.coerce.number().int().min(1).max(32).default(1),
  classId: z.string().uuid("Kelas tidak valid").optional().or(z.literal("")),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const MATERIAL_KINDS = ["dokumen", "video", "tautan", "gambar", "presentasi", "lembar_kerja", "lainnya"] as const;

export const materialSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  kind: z.enum(MATERIAL_KINDS),
  subject: z.string().trim().optional().or(z.literal("")),
  grade: z.string().trim().optional().or(z.literal("")),
  topic: z.string().trim().optional().or(z.literal("")),
  lessonPlanId: z.string().uuid("Modul tidak valid").optional().or(z.literal("")),
  url: z.string().trim().url("URL tidak valid").optional().or(z.literal("")),
  body: z.string().optional().or(z.literal("")),
});

export const questionBankSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  subject: z.string().trim().optional().or(z.literal("")),
  grade: z.string().trim().optional().or(z.literal("")),
  topic: z.string().trim().optional().or(z.literal("")),
});

export const QUESTION_TYPES = ["pilihan_ganda", "isian", "benar_salah", "menjodohkan", "essay", "praktik", "proyek"] as const;
export const DIFFICULTIES = ["mudah", "sedang", "sukar"] as const;
export const BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"] as const;

export const questionSchema = z.object({
  bankId: z.string().uuid("Bank soal tidak valid"),
  questionType: z.enum(QUESTION_TYPES),
  difficulty: z.enum(DIFFICULTIES),
  bloomLevel: z.enum(BLOOM_LEVELS).optional().or(z.literal("")),
  subject: z.string().trim().optional().or(z.literal("")),
  grade: z.string().trim().optional().or(z.literal("")),
  topic: z.string().trim().optional().or(z.literal("")),
  content: z.string().trim().min(4, "Isi soal minimal 4 karakter"),
  answer: z.string().trim().optional().or(z.literal("")),
  explanation: z.string().trim().optional().or(z.literal("")),
});

export const ASSESSMENT_KINDS = ["formatif", "sumatif", "proyek", "praktik", "observasi", "uji_kompetensi"] as const;

export const assessmentSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  classId: z.string().uuid("Kelas wajib dipilih"),
  kind: z.enum(ASSESSMENT_KINDS),
  scheduledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional().or(z.literal("")),
  maxScore: z.coerce.number().positive("Skor maksimal harus positif").default(100),
  lessonPlanId: z.string().uuid("Modul tidak valid").optional().or(z.literal("")),
});

export const scoreSchema = z.object({
  score: z.number().min(0, "Skor tidak boleh negatif"),
  feedback: z.string().optional().or(z.literal("")),
});

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  description: z.string().trim().optional().or(z.literal("")),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD").optional().or(z.literal("")),
});

export const EVENT_KINDS = ["akademik", "kbm", "asesmen", "rapat", "acara", "lainnya"] as const;

export const eventSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  description: z.string().trim().optional().or(z.literal("")),
  startsAt: z.string().min(1, "Waktu mulai wajib diisi"),
  endsAt: z.string().optional().or(z.literal("")),
  kind: z.enum(EVENT_KINDS),
  classId: z.string().uuid("Kelas tidak valid").optional().or(z.literal("")),
});
