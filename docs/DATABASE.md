# Teacher OS — Database Design

> DB: PostgreSQL (Supabase) + pgvector. PK: UUID. Semua tabel punya `id, created_at, updated_at`. Data milik guru punya `created_by`. Data siswa/dokumen penting punya `deleted_at` (soft delete).

## 1. Core groups

**Identity & org:** users, profiles, schools, teachers, teacher_schools
**Pendidikan:** education_levels, subjects, curricula, curriculum_versions, learning_standards, learning_objectives, academic_years, semesters
**Kelas & siswa:** classes, students, parents (mencakup wali via kolom `relation`: ayah/ibu/wali — diputuskan tidak ada tabel `guardians` terpisah), enrollments, attendance
**Perencanaan:** lesson_plans, learning_objectives, materials
**Soal & nilai:** question_banks, questions, assessment_questions, assignments (Phase 3+), assessments, assessment_results, rubrics, student_progress (diturunkan dari results; tabel khusus Phase 3+ bila perlu)
**Produktivitas:** calendar_events, tasks
**Knowledge & AI:** knowledge_documents, knowledge_chunks (embedding vector), ai_conversations, ai_messages, ai_actions
**Dokumen & file:** document_templates, generated_documents, files, integrations, integration_secrets
**Operasional:** notifications, integrations, communication_logs, professional_development, teacher_skills, school_documents, audit_logs

## 2. Relasi kunci

```
schools 1—N teachers, classes, school_documents
teachers N—N classes (teacher_classes)
classes 1—N enrollments N—1 students
students 1—N parents/guardians, attendance, assessment_results, student_progress
curricula 1—N versions 1—N standards 1—N objectives
objectives N—N lesson_plans, materials, questions
lesson_plans 1—N materials, assignments, assessments
assessments 1—N results, rubrics
knowledge_documents 1—N knowledge_chunks
ai_conversations 1—N ai_messages, ai_actions
files: polymorphic (entity_type + entity_id + storage_key + mime_type + size + owner_id)
```

## 3. Constraints & index

* FK dengan `ON DELETE RESTRICT` untuk data nilai/siswa, `CASCADE` hanya untuk chunks/messages.
* Unique: `(school_id, name, academic_year_id)` untuk classes; `(bank_id, content_hash)` untuk dedup soal.
* Index: `(teacher_id)`, `(class_id)`, `(student_id)`, `(subject, grade, topic)`, `(created_at)`, GIN full-text pada materials/questions/knowledge_documents, HNSW/ivfflat pada embedding.
* `content_hash (SHA-256)` pada questions/files untuk deteksi duplikat.

## 4. RLS (ringkas, detail di SECURITY.md)

* Guru hanya akses `owner_id = auth.uid()` atau `school_id IN (user_schools)`.
* Data siswa sensitif: hanya guru pemilik kelas + wali kelas + sekolah terotorisasi.
* Service-role hanya dipakai di server untuk admin/seed, tidak pernah di client.

## 5. Migration & seed

* Migrasi di `src/db/migrations/NNNN_name.sql`, tiap migrasi punya rollback di file yang sama (comment `/* ROLLBACK: ... */`).
* Dilarang ubah schema manual tanpa migrasi.
* Seed dev: `src/db/seed.ts` → 1 sekolah, 3 guru, 3 kelas, 20 siswa dummy, 5 lesson plans, 20 materials, 50 questions, 3 assessments, events, tasks, knowledge docs. Tidak pakai data nyata.
