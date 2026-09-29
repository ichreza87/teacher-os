import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Good Morning, Teacher.</h1>
      <p className="mt-2 text-gray-600">
        Teacher OS membantu mengubah ide dan rencana Anda menjadi struktur kerja: perencanaan,
        administrasi, asesmen, dan dokumen.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/login" className="rounded bg-black px-4 py-2 text-white">
          Masuk
        </Link>
        <Link href="/onboarding" className="rounded border px-4 py-2">
          Onboarding
        </Link>
        <Link href="/dashboard" className="rounded border px-4 py-2">
          Dashboard
        </Link>
      </div>
      <div className="mt-6">
        <p className="font-medium">What are you working on today?</p>
        <input
          className="mt-2 w-full rounded border px-3 py-2"
          placeholder="AI Workspace tiba pada Phase 3 — mulai dari onboarding dulu."
          aria-label="Teacher command input"
          disabled
          title="AI Workspace tersedia pada Phase 3"
        />
      </div>
    </main>
  );
}
