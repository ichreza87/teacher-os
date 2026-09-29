# Teacher OS — System Architecture

> Status: Phase 1 Foundation — approved 2026-09-29
> Stack: Next.js + React + TypeScript + Tailwind + shadcn/ui + Supabase/Postgres

## 1. Product positioning

Teacher OS = Personal Operating System for Teachers. Satu codebase lintas jenjang
(PAUD, TK, SD, SMP, SMA, SMK), konten dan workflow dikonfigurasi via data, bukan `if` di kode.

Core loop: IDEA → AI UNDERSTANDS → PLAN → CREATE → TEACH → ASSESS → ANALYZE → IMPROVE → DOCUMENT → REFLECT → LEARN → PLAN AGAIN.

## 2. Layered architecture

```
Browser (localhost:3000)
  → Next.js App Router (Server Components default, Client hanya untuk interaktivitas)
  → Application Service Layer (Zod validation + permission check + audit)
  → Repository Layer (Supabase abstraction di src/db/)
  → PostgreSQL + pgvector + S3-Compatible Storage
```

Lapisan AI dan Integrasi duduk sejajar dengan UI, semua melewati Service Layer:

```
UI ──→ Service ──→ Repository ──→ DB
AI ──→ ContextBuilder ──→ AIProvider ──→ Validator ──→ ActionExecutor ──→ Service
Integrations (Notion/Google/Storage) ──→ Service
```

## 3. Module map

Foundation: auth, profile, school, education-level-config, settings.
Core data: students, classes, academic-year.
Teaching: planning → materials → question-bank → assessment → progress; calendar/tasks menempel ke planning+assessment.
AI: context-engine → assistant/workspace → actions → document-generation.
Knowledge: upload → parse → chunk → embed → retrieval.
Integrations: notion, google, storage.
Advanced: parent-comm, professional-dev, school-mgmt.

Aturan dependensi: modul hanya boleh import via `src/services/` dan `src/types/`. Dilarang import silang `modules/A → modules/B`.

## 4. Configuration-driven jenjang

`education_levels` table + `level_configs/*.json`:

```json
{ "level": "SD", "terminology": {...}, "templates": [...], "assessmentTypes": [...], "workflows": [...] }
```

Dilarang `if (level === "SD")` tersebar. Gunakan `getLevelConfig(level)`.

## 5. Key decisions

1. Supabase hanya diakses via `src/db/client.ts` + `src/db/repositories/`. Memudahkan mock/test dan migrasi.
2. Storage via `StorageAdapter` interface. Dev lokal default ke Supabase Storage, prod bisa MinIO/R2/S3.
3. Analytics via `analytics.track()` wrapper. No-op jika dimatikan. Tidak pernah kirim data siswa.
4. DocumentEngine: `generateDocument({template, data, format})`. MVP: HTML preview + PDF. DOCX/XLSX Phase 5.
5. Auth: Supabase Auth. RLS enforced di DB, bukan hanya di app.

## 6. Non-goals Phase 1

Microservices, offline-mode penuh, mobile app, SaaS multi-school billing, AI tutor/student portal. Arsitektur disiapkan (school_id scoping, adapter) tapi tidak diimplementasikan.
