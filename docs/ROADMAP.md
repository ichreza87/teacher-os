# Teacher OS — Roadmap

## Phase 1 — Foundation

* [x] ARCHITECTURE/DATABASE/AI/UX/SECURITY/ROADMAP docs
* [x] Scaffold Next.js+TS+Tailwind, `.env.example`, README
* [x] Migration 01 (profiles/schools/teachers/classes/students + academic years + RLS) + seed dummy
* [x] Auth (login, callback, middleware) + onboarding 8 step + dashboard overview + settings skeleton (settings page: Phase 2)
* [x] Lint + typecheck + test hijau (build penuh: lolos sebelumnya; host rendah memori)

## Phase 2 — Teaching Core

* [x] Migration 02 (objectives, lesson plans, materials, banks+questions, assessments+results+rubrics, tasks, events) + RLS
* [x] Students CRUD + parents + search; Classes + enrollments
* [x] Lesson planning CRUD + detail (materi & asesmen terkait); Materials CRUD + search
* [x] Question bank (banks + questions + metadata Bloom/difficulty + dedup hash)
* [x] Assessment + gradebook (bulk score entry, rata-rata, umpan balik)
* [x] Tasks (todo/in_progress/done + overdue + hapus terkonfirmasi); Calendar (agenda mendatang)
* [x] Lint + typecheck + test hijau (uji live DB menunggu kredensial Supabase)

## Phase 3 — AI Core

* [x] Migration 03 (teacher_settings, ai_conversations/messages/actions, document_templates, generated_documents) + RLS
* [x] AIProvider abstraction (mock + openai-compatible HTTP); API key hanya dari server env, tidak di DB
* [x] Context engine (agregat minim, tanpa PII penuh) + prompt builder (untrusted DATA tags) + memory policy (20 pesan terakhir)
* [x] Intent router + slot-filling clarification + action schemas + validator + executor (RLS + ownership re-check + audit)
* [x] AI Workspace 2-panel (konteks + chat + pratinjau + Setujui/Tolak + simpan sebagai materi), command palette Ctrl+K, AI Settings
* [x] Eval dataset: 16 test AI (intent, validation, injection, malformed, mock, embed)
* [x] Lint + typecheck + test hijau (uji live + provider nyata menunggu kredensial)

## Phase 4 — Knowledge + RAG

* [x] Migration 04 (knowledge_documents/chunks + pgvector + RPC match_knowledge_chunks) + RLS owner-based
* [x] Parser PDF/DOCX/TXT/MD/CSV/XLSX (maks 10 MB, maks 200rb karakter) + chunking overlap + unit test
* [x] Embedding 1536-dim tunggal (mock deterministik + OpenAI /embeddings); model embedding di AI Settings
* [x] Upload pipeline (processing → ready/failed + audit), detail + hapus terkonfirmasi, pencarian semantik + similaritas
* [x] Workspace RAG: injeksi DATA + sitasi sumber otomatis; kegagalan retrieval tidak memutus chat
* [x] Lint + typecheck + test hijau (43 test; uji live pgvector menunggu Supabase)

## Phase 5 — Integrations

* [x] Migration 05 (integrations, integration_secrets, files, knowledge file_id/external_id, bucket teacher-os-files) + RLS
* [x] Token AES-256-GCM (APP_ENCRYPTION_KEY) — tidak pernah plaintext di DB/log/client; disconnect menghapus secret (cascade)
* [x] StorageAdapter: S3-compatible (SigV4 via AWS SDK) + fallback Supabase Storage; upload Knowledge menyimpan berkas asli bila backend tersedia
* [x] Notion OAuth + impor halaman (sekali jalan, anti-duplikat via external_id) + export; tanpa auto 2-way sync
* [x] Google OAuth (scope minimal) + export Drive CSV / Docs / Sheets / Calendar; refresh token dipersist ulang bila berputar
* [x] PostHog server-side wrapper (no-op tanpa key, scrub PII, fire-and-forget); event di onboarding, AI action, upload, asesmen
* [x] Lint + typecheck + test hijau 59/59 (uji live OAuth/S3/PostHog menunggu kredensial)

## Phase 6 — Advanced

* [x] Migration 06 (comm templates/logs, professional_development, school_documents, workflow_rules/runs) + RLS
* [x] Komunikasi wali: direktori, template + placeholder, draf → setujui → kirim manual (wa.me) → tandai terkirim; tanpa auto-kirim by design; intent AI parent_message mengarahkan ke alur benar
* [x] Professional + portfolio agregat; School docs (policy/meeting/inventory/announcement); workflow rules + saran + terapkan/abaikan
* [x] Middleware proteksi semua rute privat; error/loading/not-found global
* [x] Build penuh PASS (42 rute); DoD audit di docs/AUDIT.md
* [x] Lint + typecheck + test hijau 68/68 (11 file)

## Definition of Done (per fitur)

UI + DB + API/service + validation + authZ + loading/error/empty + responsive + a11y dasar + test + docs. Tanpa ini dilarang klaim "selesai".
