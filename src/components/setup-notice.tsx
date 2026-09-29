export default function SetupNotice() {
  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-medium">Supabase belum dikonfigurasi</p>
      <ol className="mt-2 list-decimal pl-5">
        <li>
          Salin <code>.env.example</code> menjadi <code>.env</code>.
        </li>
        <li>
          Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dari dashboard Supabase.
        </li>
        <li>
          Jalankan migrasi <code>src/db/migrations/0001_core_foundation.sql</code> (lihat README
          bagian Database Setup), lalu restart dev server.
        </li>
      </ol>
    </div>
  );
}
