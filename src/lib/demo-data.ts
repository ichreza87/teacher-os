/** Dataset contoh untuk Mode Demo (mencerminkan screenshot referensi).
 *  Bukan data nyata. Dipakai hanya bila sesi demo aktif. */

export const DEMO_TEACHER = {
  name: "Reza Fajri, S.Pd.,Gr.",
  role: "Guru Kelas 5",
  initials: "RF",
};

export const DEMO_SUBTITLE =
  "Teruslah menginspirasi, karena setiap anak berhak mendapatkan kesempatan terbaik.";

export interface DemoStat {
  label: string;
  value: string;
  color: string;
}

export const DEMO_STATS: DemoStat[] = [
  { label: "Kelas Saya", value: "6 kelas", color: "#3b82f6" },
  { label: "Siswa Aktif", value: "142 siswa", color: "#22c55e" },
  { label: "Tugas & Ujian", value: "12 tugas", color: "#f59e0b" },
  { label: "Notifikasi", value: "3 baru", color: "#ef4444" },
];

export interface DemoScheduleItem {
  time: string;
  text: string;
}

export const DEMO_SCHEDULE: DemoScheduleItem[] = [
  { time: "07.00 - 08.00", text: "Kelas 5A - Matematika" },
  { time: "08.15 - 09.15", text: "Kelas 5B - Bahasa Indonesia" },
  { time: "10.00 - 11.00", text: "Kelas 6A - IPA" },
  { time: "13.00 - 14.00", text: "Kelas 6B - IPS" },
];

export interface DemoTask {
  title: string;
  badge: string | null;
  badgeColor: string;
  due: string;
}

export const DEMO_TASKS: DemoTask[] = [
  { title: "Unggah RPP Semester 2", badge: "Penting", badgeColor: "#ef4444", due: "Hari ini" },
  { title: "Input nilai harian Kelas 5A", badge: null, badgeColor: "#22c55e", due: "Hari ini" },
  { title: "Rekap Absensi Semester 1", badge: null, badgeColor: "#22c55e", due: "3 hari lagi" },
  { title: "Persiapan SPMB 2026/2027", badge: null, badgeColor: "#22c55e", due: "5 hari lagi" },
];

export interface DemoBar {
  month: string;
  value: number;
  color: string;
}

export const DEMO_CHART: DemoBar[] = [
  { month: "Jul", value: 38, color: "#fb923c" },
  { month: "Agu", value: 68, color: "#8b5cf6" },
  { month: "Sep", value: 76, color: "#22c55e" },
  { month: "Okt", value: 85, color: "#14b8a6" },
  { month: "Nov", value: 60, color: "#3b82f6" },
  { month: "*", value: 70, color: "#0ea5e9" },
  { month: "Des", value: 92, color: "#8b5cf6" },
];

export const DEMO_CHART_MAX = 100;

export const DEMO_ANNOUNCEMENT = {
  title: "Pengumuman",
  text: "Selamat! Sekolah Anda lolos sebagai Sekolah Penggerak angkatan 3.",
  date: "25 Sep 2025",
};
