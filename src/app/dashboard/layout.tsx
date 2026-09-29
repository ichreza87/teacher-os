import Sidebar from "@/components/sidebar";
import { getDemoSession } from "@/lib/demo";
import { DEMO_TEACHER } from "@/lib/demo-data";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const demo = getDemoSession();
  return (
    <div className="flex min-h-screen">
      <Sidebar
        active="/dashboard"
        userName={demo ? DEMO_TEACHER.name : undefined}
        userRole={demo ? DEMO_TEACHER.role : undefined}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
