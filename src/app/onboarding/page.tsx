import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/modules/profile/onboarding-form";
import SetupNotice from "@/components/setup-notice";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold">Onboarding</h1>
        <div className="mt-4">
          <SetupNotice />
        </div>
      </main>
    );
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">Selamat datang di Teacher OS</h1>
      <p className="mt-1 text-sm text-gray-600">Lengkapi 8 langkah agar workspace Anda terbentuk.</p>
      <div className="mt-6">
        <OnboardingForm />
      </div>
    </main>
  );
}
