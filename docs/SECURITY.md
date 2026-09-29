# Teacher OS — Security Architecture

> Prioritas: Correctness > Security > Maintainability > UX > Performance.

## 1. Auth & session

* Supabase Auth (email/password MVP, OAuth Google opsional Phase 5).
* Session httpOnly, refresh server-side. Token OAuth terenkripsi (AES-GCM via `APP_ENCRYPTION_KEY`), tidak plaintext, tidak ke frontend/log.

## 2. Authorization + RLS

* RLS wajib di semua tabel milik user/sekolah. Prinsip: Teacher A tidak bisa akses data Teacher B.
* Policy pola: `owner_id = auth.uid() OR school_id IN (SELECT school_id FROM teacher_schools WHERE teacher_id = auth.uid())`.
* Client hanya pakai anon key + RLS. Service-role hanya di server actions/migrations/seed.
* Test RLS: buat 2 guru, pastikan cross-read ditolak.

## 3. Input/output

* Validasi Zod di server untuk semua mutation + AI action. Sanitise HTML (tiptap/markdown render aman dari XSS).
* Upload: MIME whitelist (pdf, docx, xlsx, csv, jpg, png, bmp), magic-byte check, max 25MB, simpan dengan storage_key acak, serve via signed URL 15 menit.
* SQL injection: hanya via Supabase client/query builder, tidak ada string concat.

## 4. AI & privacy

* ContextBuilder + allowlist field. Jangan kirim seluruh DB ke AI.
* PostHog: matikan default di dev; di prod opt-in; tidak kirim nama/NISN/nilai mentah siswa.
* Log terstruktur `{timestamp, level, user_id, action, module, request_id, error}` — tidak boleh ada password, API key, token, PII siswa.

## 5. Audit & secrets

* `audit_logs`: created/updated/deleted/exported/imported/ai_generated/ai_approved/ai_rejected/message_sent/integration_connected.
* OAuth/API token integrasi (Notion/Google) disimpan terenkripsi AES-256-GCM
  (`integration_secrets`, kunci `APP_ENCRYPTION_KEY`) — tidak pernah plaintext,
  tidak ke frontend/log; disconnect menghapus baris secrets via cascade.
* Secret hanya via env. `.env` tidak dicommit.
* Destructive migration/rm source tanpa konfirmasi eksplisit dilarang.
