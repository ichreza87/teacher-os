"use server";

import { redirect } from "next/navigation";
import {
  DEMO_COOKIE,
  checkDemoCredentials,
  demoExpiry,
  isDemoEnabled,
  signDemoToken,
} from "@/lib/demo";

export async function loginDemo(formData: FormData): Promise<never> {
  if (!isDemoEnabled()) redirect("/login?error=" + encodeURIComponent("Mode demo dimatikan di server ini."));
  const user = String(formData.get("username") ?? "").trim();
  const pass = String(formData.get("password") ?? "");
  if (!checkDemoCredentials(user, pass)) {
    redirect("/login?error=" + encodeURIComponent("Kredensial demo salah. Gunakan admin / admin."));
  }
  const { cookies } = await import("next/headers");
  const store = cookies();
  store.set(DEMO_COOKIE, signDemoToken(user, demoExpiry()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  redirect("/dashboard");
}

export async function logoutDemo(): Promise<never> {
  const { cookies } = await import("next/headers");
  cookies().delete(DEMO_COOKIE);
  redirect("/login");
}
