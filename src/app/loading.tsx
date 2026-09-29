/** Global loading skeleton for route transitions. */
export default function Loading() {
  return (
    <main className="p-8" aria-busy="true" aria-label="Memuat">
      <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 max-w-3xl space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-gray-100" />
      </div>
    </main>
  );
}
