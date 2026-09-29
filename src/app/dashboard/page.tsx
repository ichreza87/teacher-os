import Link from "next/link";
import { Bell, CalendarDays, ClipboardCheck, Megaphone, Users } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getDemoSession, timeGreeting } from "@/lib/demo";
import {
  DEMO_ANNOUNCEMENT,
  DEMO_CHART,
  DEMO_CHART_MAX,
  DEMO_SCHEDULE,
  DEMO_STATS,
  DEMO_SUBTITLE,
  DEMO_TASKS,
  DEMO_TEACHER,
} from "@/lib/demo-data";
import { logoutDemo } from "@/app/login/actions";
import SetupNotice from "@/components/setup-notice";

const STAT_ICONS = [CalendarDays, Users, ClipboardCheck, Bell];

function DemoDashboard() {
  const now = new Date();
  const datePill = now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return (
    <main className="min-h-screen bg-[#f3f5f7] p-6">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm">
        <span>Mode Demo — data contoh (login admin/admin). Hubungkan Supabase untuk data nyata.</span>
        <form action={logoutDemo}>
          <button type="submit" className="rounded border px-2 py-1 text-xs">Keluar Demo</button>
        </form>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {timeGreeting(now.getHours())}, {DEMO_TEACHER.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{DEMO_SUBTITLE}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-600 shadow-sm">{datePill}</span>
          <Link href="/tasks" aria-label="Notifikasi" className="relative rounded-full bg-white p-2 shadow-sm">
            <Bell className="h-4 w-4 text-gray-600" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">1</span>
          </Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
            {DEMO_TEACHER.initials}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {DEMO_STATS.map((s, i) => {
          const Icon = STAT_ICONS[i % STAT_ICONS.length];
          return (
            <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-lg p-2.5" style={{ backgroundColor: s.color }}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-sm font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Jadwal Hari Ini</h2>
            <Link href="/calendar" className="text-xs text-emerald-600">Lihat Semua →</Link>
          </div>
          <ul className="mt-3 space-y-3">
            {DEMO_SCHEDULE.map((j) => (
              <li key={j.time} className="flex items-center gap-3 text-sm">
                <span className="h-6 w-1.5 rounded-full bg-emerald-500" />
                <span className="w-28 shrink-0 text-gray-500">{j.time}</span>
                <span className="font-medium text-gray-800">{j.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Tugas & Agenda</h2>
            <Link href="/tasks" className="text-xs text-emerald-600">Lihat Semua →</Link>
          </div>
          <ul className="mt-3 space-y-3">
            {DEMO_TASKS.map((t) => (
              <li key={t.title} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2" style={{ borderColor: t.badgeColor }} />
                <span className="flex-1 text-gray-800">{t.title}</span>
                {t.badge && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-600">{t.badge}</span>
                )}
                <span className="shrink-0 text-xs text-gray-400">{t.due}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Grafik Perkembangan Siswa</h2>
            <span className="rounded border px-2 py-0.5 text-xs text-gray-500">Kelas 5A</span>
          </div>
          <div className="mt-4 flex h-40 items-end justify-between gap-2" role="img" aria-label="Grafik perkembangan siswa per bulan">
            {DEMO_CHART.map((b) => (
              <div key={b.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t" style={{ height: `${(b.value / DEMO_CHART_MAX) * 100}%`, backgroundColor: b.color }} />
                <span className="text-[11px] text-gray-500">{b.month}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-gray-900">
              <Megaphone className="h-4 w-4 text-purple-600" />
              {DEMO_ANNOUNCEMENT.title}
            </h2>
            <Link href="/school" className="text-xs text-emerald-600">Lihat Semua →</Link>
          </div>
          <p className="mt-3 text-sm text-gray-700">{DEMO_ANNOUNCEMENT.text}</p>
          <p className="mt-1 text-xs text-gray-400">{DEMO_ANNOUNCEMENT.date}</p>
        </section>
      </div>
    </main>
  );
}

export default async function DashboardPage() {
  const demo = getDemoSession();
  if (demo) return <DemoDashboard />;
  if (!isSupabaseConfigured()) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="mt-4 max-w-2xl">
          <SetupNotice />
        </div>
      </main>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm">
          <Link href="/login" className="underline">Masuk</Link> untuk melihat dashboard Anda.
        </p>
      </main>
    );
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, school_id, subject, role, education_level_code")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!teacher?.school_id) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="mt-4 max-w-2xl rounded border p-4">
          <p className="font-medium">Belum ada konteks mengajar.</p>
          <p className="mt-1 text-sm text-gray-600">
            Lengkapi onboarding agar Teacher OS memahami jenjang, sekolah, dan kelas Anda.
          </p>
          <Link href="/onboarding" className="mt-3 inline-block rounded bg-black px-4 py-2 text-white">
            Lengkapi Onboarding
          </Link>
        </div>
      </main>
    );
  }

  const schoolId = teacher.school_id as string;
  const [{ count: teacherCount }, { count: classCount }, { count: studentCount }] = await Promise.all([
    supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
  ]);

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, grade, homeroom_teacher_id")
    .eq("school_id", schoolId)
    .order("name")
    .limit(20);

  const { data: unenrolled } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .limit(1000);
  const { data: enrolledRows } = await supabase
    .from("enrollments")
    .select("student_id")
    .in("student_id", (unenrolled ?? []).map((s) => s.id).slice(0, 1000));
  const enrolledSet = new Set((enrolledRows ?? []).map((r) => r.student_id));
  const unenrolledCount = (unenrolled ?? []).filter((s) => !enrolledSet.has(s.id)).length;
  const classesWithoutHomeroom = (classes ?? []).filter((c) => !c.homeroom_teacher_id).length;

  const insights: string[] = [];
  if (unenrolledCount > 0) insights.push(`${unenrolledCount} siswa belum memiliki kelas pada tahun ajaran ini.`);
  if (classesWithoutHomeroom > 0) insights.push(`${classesWithoutHomeroom} kelas belum memiliki wali kelas.`);
  if ((classCount ?? 0) === 0) insights.push("Belum ada kelas. Tambahkan kelas pertama Anda.");
  if ((studentCount ?? 0) === 0) insights.push("Belum ada data siswa.");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Good Morning, Teacher.</h1>
      <p className="mt-1 text-sm text-gray-600">
        {teacher.subject ?? "-"} · {teacher.role} · {teacher.education_level_code ?? "-"}
      </p>

      <div className="mt-6 grid max-w-3xl grid-cols-3 gap-3">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Guru</p>
          <p className="text-2xl font-semibold">{teacherCount ?? 0}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Kelas</p>
          <p className="text-2xl font-semibold">{classCount ?? 0}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Siswa</p>
          <p className="text-2xl font-semibold">{studentCount ?? 0}</p>
        </div>
      </div>

      <div className="mt-6 max-w-3xl rounded border p-4">
        <p className="font-medium">AI Insights</p>
        {insights.length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">Semua data dasar lengkap. Kerja bagus.</p>
        ) : (
          <ul className="mt-1 list-disc pl-5 text-sm">
            {insights.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 max-w-3xl rounded border p-4">
        <p className="font-medium">Kelas Anda</p>
        {(classes ?? []).length === 0 ? (
          <p className="mt-1 text-sm text-gray-600">Belum ada kelas.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {(classes ?? []).map((c) => (
              <li key={c.id}>
                {c.name}
                {c.grade ? ` (tingkat ${c.grade})` : ""}
                {!c.homeroom_teacher_id && " — belum ada wali kelas"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 max-w-3xl rounded border p-4">
        <p className="font-medium">Aksi cepat</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link href="/planning/new" className="rounded border px-3 py-1">Buat Modul</Link>
          <Link href="/assessments/new" className="rounded border px-3 py-1">Buat Asesmen</Link>
          <Link href="/students/new" className="rounded border px-3 py-1">Tambah Siswa</Link>
          <Link href="/materials/new" className="rounded border px-3 py-1">Tambah Materi</Link>
          <Link href="/tasks" className="rounded border px-3 py-1">Tugas</Link>
          <Link href="/calendar" className="rounded border px-3 py-1">Kalender</Link>
        </div>
      </div>

      <div className="mt-6 max-w-3xl rounded border p-4">
        <p className="font-medium">Otomatisasi</p>
        <p className="mt-1 text-sm text-gray-600">
          Saran kerja otomatis (modul tanpa asesmen, nilai lengkap, tugas terlambat) — atur di{" "}
          <Link href="/school/workflows" className="underline">School → Otomatisasi</Link>.
        </p>
      </div>

      <div className="mt-6 max-w-3xl rounded border p-4">
        <p className="font-medium">Jadwal hari ini</p>
        <p className="mt-1 text-sm text-gray-600">
          Lihat agenda mendatang di <Link href="/calendar" className="underline">Calendar</Link>.
        </p>
      </div>
    </main>
  );
}
