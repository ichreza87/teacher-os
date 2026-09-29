import { isDemoEnabled } from "@/lib/demo";
import { Field, FormError, inputCls } from "@/components/ui";
import LoginForm from "./login-form";
import { loginDemo } from "./actions";

const CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ERROR_TEXT: Record<string, string> = {
  domain: "Akun harus Belajar.id (@...belajar.id). Anda sudah dikeluarkan; masuk kembali dengan akun Belajar.id.",
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const demo = isDemoEnabled();
  const friendlyError = (searchParams.error && ERROR_TEXT[searchParams.error]) || searchParams.error;
  return (
    <main className="mx-auto max-w-md p-8">
      {CONFIGURED ? (
        <LoginForm />
      ) : (
        <div>
          <h1 className="text-xl font-semibold">Login Supabase belum tersedia</h1>
          <p className="mt-2 text-sm text-gray-600">
            Supabase belum dikonfigurasi. Salin <code>.env.example</code> menjadi{" "}
            <code>.env</code> lalu isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Sementara itu, gunakan login ujicoba di bawah.
          </p>
          <div className="mt-4 border-t pt-4">
            <button type="button" disabled title="Butuh Supabase + provider Google (lihat README bagian Login Belajar.id)"
              className="w-full cursor-not-allowed rounded border border-blue-600 px-3 py-2 text-blue-700 opacity-50">
              Masuk dengan Belajar.id (Google)
            </button>
            <p className="mt-1 text-xs text-gray-500">
              Nonaktif: butuh Supabase + provider Google aktif. Hanya akun @...belajar.id yang akan diterima.
            </p>
          </div>
        </div>
      )}

      {demo && (
        <div className="mt-6 rounded border border-emerald-300 bg-emerald-50 p-4">
          <p className="font-medium">Login ujicoba</p>
          <p className="mt-1 text-xs text-gray-600">
            Tanpa database — menjelajah dengan data contoh. User: <code>admin</code>, Password: <code>admin</code>.
          </p>
          <form action={loginDemo} className="mt-3 space-y-3">
            <FormError message={friendlyError} />
            <Field label="User" htmlFor="username">
              <input id="username" name="username" defaultValue="admin" required className={inputCls} autoComplete="username" />
            </Field>
            <Field label="Password" htmlFor="demopass">
              <input id="demopass" name="password" type="password" defaultValue="admin" required className={inputCls} autoComplete="current-password" />
            </Field>
            <button type="submit" className="w-full rounded bg-emerald-700 px-3 py-2 text-white">
              Masuk Demo
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
