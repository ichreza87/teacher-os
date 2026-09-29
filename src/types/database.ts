/** Minimal row types for Phase 1 tables. Kept in sync with migration 0001. */

export interface School {
  id: string;
  name: string;
  npsn: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string | null;
  school_id: string | null;
  nip: string | null;
  nuptk: string | null;
  education_level_code: string | null;
  subject: string | null;
  role: "guru_kelas" | "guru_mapel" | "guru_bk" | "guru_pendamping" | "wali_kelas";
  position: string | null;
  bio: string | null;
}

export interface ClassRow {
  id: string;
  school_id: string;
  academic_year_id: string | null;
  education_level_code: string | null;
  grade: string | null;
  name: string;
  homeroom_teacher_id: string | null;
}

export interface Student {
  id: string;
  school_id: string;
  full_name: string;
  nisn: string | null;
  gender: "L" | "P" | null;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: "aktif" | "pindah" | "lulus" | "keluar";
}
