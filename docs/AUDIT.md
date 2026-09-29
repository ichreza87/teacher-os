# Teacher OS — Definition of Done Audit (Phase 6, 2026-09-29)

Verifikasi: `tsc` PASS, `next lint` PASS, `vitest` 68/68 PASS, `next build` PASS (42 rute).
Uji live DB/OAuth/provider-nyata tertunda (butuh kredensial Supabase + keys).

Legenda: OK = memenuhi · SEBAGIAN = memenuhi dengan catatan · TUNDA = menunggu kredensial.

## Per modul

| Modul | UI | DB+RLS | Service/API | Validasi | AuthZ | Loading/Error/Empty | Test | Catatan |
|---|---|---|---|---|---|---|---|---|
| Auth/onboarding/dashboard | OK | OK | OK | OK (zod) | OK (middleware semua rute privat) | OK (+error/loading/not-found global) | OK | - |
| Students/classes | OK | OK | OK | OK | OK (RLS+scope) | OK | OK (schema) | Tanpa live-RLS test |
| Planning/materials | OK | OK | OK | OK | OK | OK | OK (schema) | - |
| Question bank | OK | OK (+dedup) | OK | OK | OK | OK | OK | Varian AI → Phase lanjut |
| Assessment/gradebook | OK | OK | OK | OK (0–maks) | OK | OK | OK | Rubrik editor minimal (JSON) |
| Tasks/calendar | OK | OK | OK | OK | OK (tasks personal) | OK | OK | - |
| AI workspace | OK (2-panel) | OK | OK (router→propose→execute) | OK (schema+validator) | OK (owner+scope) | OK | OK (18 test) | Provider nyata belum diuji live |
| Knowledge/RAG | OK | OK | OK | OK | OK (owner) | OK | OK (11 test) | Berkas asli perlu S3/Supabase live |
| Integrations | OK | OK | OK | OK | OK (token terenkripsi) | OK (setup states) | OK (14 test) | OAuth/S3/PostHog belum live |
| Communication | OK | OK | OK | OK | OK | OK | OK (7 test) | Tanpa auto-kirim (by design) |
| Professional/school | OK | OK | OK | OK | OK | OK | OK (workflow 3 test) | Portfolio agregat dasar |
| Analytics | OK (wrapper) | - | OK | OK (scrub) | - | - | OK | Server events saja |

## Keputusan principal yang menyimpang dari spec (terdokumentasi)

1. `guardians` digabung ke `parents.relation` (hindari tabel duplikat).
2. `teachers.user_id` nullable (impor operator sebelum klaim akun).
3. API key AI & token OAuth tidak di DB plaintext (env + AES-GCM).
4. Berkas asli knowledge disimpan hanya bila backend tersedia (jujur di UI).
5. Notion tanpa auto 2-way sync (impor sekali jalan + tolak duplikat).
6. Tasks personal (owner), bukan school-wide.
7. Anthropic/Gemini native ditunda; OpenAI-compatible mencakup lokal.

## Risiko terbuka (butuh kredensial untuk menutup)

1. Migrasi 01–06 belum dieksekusi ke Postgres live (urutan + pgvector + bucket).
2. RLS cross-teacher dan RPC match_knowledge_chunks belum diuji live.
3. OAuth Notion/Google, S3 put/signed-URL, PostHog delivery belum live.
4. next@14.2.5 advisory keamanan (upgrade saat memori host memungkinkan).
5. `npm test` exit-code teardown anomali di host ini (-1073741819) meski 68/68 PASS.
