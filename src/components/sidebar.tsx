import Link from "next/link";
import {
  BookOpen,
  Bot,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Home,
  MessagesSquare,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

interface NavItem {
  href: string | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: Home },
  { href: "/planning", label: "Pembelajaran", icon: BookOpen },
  { href: "/assessments", label: "Penilaian", icon: ClipboardCheck },
  { href: "/school", label: "Administrasi", icon: FileText },
  { href: "/tasks", label: "Tugas & Agenda", icon: CalendarDays },
  { href: "/students", label: "Kelas & Siswa", icon: Users },
  { href: null, label: "Komunitas & Kolaborasi", icon: MessagesSquare },
  { href: "/professional", label: "Pengembangan Diri", icon: TrendingUp },
  { href: "/workspace", label: "AI Asisten", icon: Bot },
  { href: "/settings/ai", label: "Pengaturan", icon: Settings },
];

export default function Sidebar({ active = "/dashboard", userName, userRole }: {
  active?: string;
  userName?: string;
  userRole?: string;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#0b3a37] p-4 text-white">
      <p className="px-2 text-xl font-bold tracking-tight">
        Teacher<span className="text-emerald-400">OS</span>
      </p>
      <nav aria-label="Navigasi utama" className="mt-6 flex-1">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === active;
            const cls = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              isActive ? "bg-emerald-500 font-medium text-white" : "text-emerald-50/80 hover:bg-white/10"
            }`;
            if (!item.href) {
              return (
                <li key={item.label}>
                  <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-emerald-50/40" title="Segera hadir">
                    <Icon className="h-4 w-4" />
                    {item.label}
                    <span className="ml-auto rounded bg-white/10 px-1 text-[10px]">Segera</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={item.href + item.label}>
                <Link href={item.href} className={cls}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 p-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold">
          {(userName ?? "G").split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium">{userName ?? "Guru"}</span>
          <span className="block truncate text-[11px] text-emerald-50/70">{userRole ?? "Teacher OS"}</span>
        </span>
      </div>
    </aside>
  );
}
