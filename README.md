# Teacher OS — AI-Powered Teacher Operating System
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/5026a060-9372-4918-b809-cf487cccbcc0" />



Local-first teacher OS. Satu Aplikasi untuk Guru PAUD/TK/SD/SMP/SMA/SMK.

Panduan: **[docs/MANUAL.md](docs/MANUAL.md)** (manual pengguna + tutorial instalasi lengkap).
Teknis: `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/AI_ARCHITECTURE.md`, `docs/UX.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`, `docs/AUDIT.md`.

## Instalasi Cepat (5 menit, tanpa database)
<img width="1906" height="803" alt="image" src="https://github.com/user-attachments/assets/0eaefa25-eb7b-460a-93b8-e0fc4d662ce6" />

Prasyarat: Node.js 20+ dan npm 10+ (`node -v`, `npm -v`).

```bash
git clone https://github.com/ichreza87/teacher-os.git
cd teacher-os
cp .env.example .env
npm install
npm run dev -- --port 3100
```

Buka `http://localhost:3100/login` → **Masuk Demo** (user `admin`, password `admin`).
Mode demo memakai data contoh; cocok untuk menjelajah seluruh tampilan.

## Instalasi Penuh (dengan database)

1. Buat project gratis di [supabase.com](https://supabase.com) → salin
   Project URL, anon key, dan connection string (Settings → Database).
2. Di Supabase Dashboard → Database → Extensions: aktifkan **vector**.
3. Isi `.env`: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. `npm run db:setup` (migrasi 01–06 + seed dummy, idempoten).
5. Buat 3 auth user di Supabase Dashboard (Authentication → Add user), klaim guru seed:
   `update teachers set user_id = '<auth-uuid>' where id = '<teacher-uuid>';`
6. `npm run dev -- --port 3100` → login dengan email terdaftar
   (atau akun `@...belajar.id` bila provider Google dikonfigurasi, lihat bawah).

## Requirements

Node 20+, npm 10+, Supabase project (atau lokal), S3-compatible (opsional dev).

## Login Belajar.id

Login memakai akun Belajar.id (berbasis Google) via tombol
**Masuk dengan Belajar.id (Google)** di `/login`. Hanya email `@...belajar.id`
yang diterima (`ALLOWED_LOGIN_DOMAINS`, default `belajar.id`); akun lain
dikeluarkan otomatis oleh middleware + pemeriksaan ganda di service layer.

Yang harus disiapkan (sekali, oleh operator):

1. Google Cloud Console: OAuth client (Web) dengan redirect
   `https://<project>.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → aktifkan **Google**,
   isi Client ID + Secret dari langkah 1.
3. Opsional: batasi pendaftar baru (Invite-only) bila perlu.

Catatan teknis: parameter `hd` Google tidak dipakai karena Belajar.id memakai
banyak subdomain (guru.sma., guru.sd., ...); domain dicek setelah OAuth
(`src/lib/auth-domains.ts`, diuji di `tests/auth-domains.test.ts`).

## Database Setup (satu perintah)

```bash
cp .env.example .env   # isi DATABASE_URL + Supabase keys
npm run db:setup        # migrate 01–06 berurutan + seed dummy (idempoten)
```

Perintah lain:

* `npm run db:migrate` — terapkan migrasi yang belum jalan (lacak di `schema_migrations`).
* `npm run db:seed` — seed dummy + petunjuk klaim guru.
* `npm run db:reset -- --yes` — HAPUS semua data (wajib flag `--yes`, tanpa itu ditolak).

Aktifkan ekstensi **vector** di Supabase (Database → Extensions) sebelum migrate
(migrasi 0004 membutuhkannya).

4. Seed dummy (1 sekolah, 3 guru tanpa akun, 3 kelas, 20 siswa):

```bash
psql "$DATABASE_URL" -f src/db/seed/seed_dev.sql
```

5. Buat 3 auth user via Supabase Dashboard (Authentication → Add user), lalu klaim
   baris guru seed:

```sql
update teachers set user_id = '<auth-user-uuid>' where id = '<teacher-uuid>';
```

## Scripts

* `npm run dev` — dev server
* `npm run lint` — `next lint --dir src`
* `npm run typecheck` — tsc --noEmit
* `npm test` — vitest (pool vmThreads: environment ini memblokir spawn worker)
* `npm run build` — next build

## Integrations Setup

* **S3 (opsional):** isi `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`,
  `S3_BUCKET`. Tanpa ini, berkas memakai Supabase Storage (bucket `teacher-os-files`
  dibuat oleh migrasi 0005).
* **Notion:** buat public integration, redirect URI
  `NEXT_PUBLIC_APP_URL/api/integrations/notion/callback`; isi `NOTION_CLIENT_ID/SECRET`.
* **Google:** buat OAuth client, redirect URI
  `NEXT_PUBLIC_APP_URL/api/integrations/google/callback`; isi `GOOGLE_CLIENT_ID/SECRET`.
* **Token:** butuh `APP_ENCRYPTION_KEY` (string acak panjang) — tanpa ini connect OAuth
  dan dekripsi token gagal dengan pesan jujur. Produksi: ganti dengan KMS.
* **PostHog (opsional):** isi `POSTHOG_KEY` (+ `POSTHOG_HOST` bila self-host).
  Tanpa key, analytics no-op. `ANALYTICS_ENABLED=false` mematikan paksa.

## AI Configuration

Pilih provider di halaman AI Settings (`/settings/ai`):

* `mock` (default): offline, tanpa API key. Cocok untuk development dan demo alur.
* `openai_compat`: endpoint HTTP yang kompatibel OpenAI. Isi model + (opsional) base URL
  untuk server lokal. Kunci dibaca dari `AI_API_KEY` di `.env` server — tidak pernah
  disimpan di database atau dikirim ke browser.

```bash
AI_PROVIDER=mock
AI_API_KEY=
```

## Status

Phase 1 Foundation: migration 01 + RLS + seed + auth + onboarding 8-step +
dashboard foundation selesai dan terverifikasi (typecheck/lint/test hijau).
Phase 2 Teaching Core berikutnya.
