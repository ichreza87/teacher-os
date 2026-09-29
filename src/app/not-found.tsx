import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-gray-600">
        Alamat yang Anda tuju tidak ada atau sudah dipindahkan.
      </p>
      <div className="mt-4 flex justify-center gap-2 text-sm">
        <Link href="/dashboard" className="rounded bg-black px-4 py-2 text-white">Dashboard</Link>
        <Link href="/" className="rounded border px-4 py-2">Home</Link>
      </div>
    </main>
  );
}
