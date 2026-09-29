"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInGoogle() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">
        {mode === "signin" ? "Masuk ke Teacher OS" : "Buat akun Teacher OS"}
      </h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Kata sandi
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Memproses..." : mode === "signin" ? "Masuk" : "Daftar"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-3 text-sm underline"
      >
        {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
      </button>
      <div className="mt-4 border-t pt-4">
        <button
          type="button"
          onClick={signInGoogle}
          disabled={loading}
          className="w-full rounded border border-blue-600 px-3 py-2 text-blue-700 disabled:opacity-50"
        >
          Masuk dengan Belajar.id (Google)
        </button>
        <p className="mt-1 text-xs text-gray-500">
          Hanya akun @...belajar.id yang diterima. Butuh provider Google aktif di Supabase (lihat README).
        </p>
      </div>
    </div>
  );
}
