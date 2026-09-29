"use client";

import { useEffect } from "react";

/** Global error boundary: friendly message + Error ID, never a stack trace. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Technical log goes to the server console, not the screen.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="mt-2 text-sm text-gray-600">
        Maaf, halaman ini gagal dimuat. Coba lagi — jika berlanjut, catat ID error di bawah
        dan laporkan ke operator.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-500">Error ID: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded bg-black px-4 py-2 text-sm text-white"
      >
        Coba Lagi
      </button>
    </main>
  );
}
