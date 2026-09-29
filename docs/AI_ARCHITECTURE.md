# Teacher OS — AI Architecture

> Prinsip: AI adalah orchestrator, bukan chatbot bebas. Semua mutasi via Structured Action → Validation → User Confirmation → DB Mutation.

## 1. AIProvider abstraction

```ts
interface AIProvider {
  name: string;
  chat(req: AIChatRequest): Promise<AIChatResponse>;
  generateStructured<T>(req: AIStructuredRequest<T>): Promise<T>;
  embed?(texts: string[]): Promise<number[][]>;
}
// providers: openai, anthropic, gemini, local, mock
```

Config via Settings (`AI_PROVIDER`, `AI_API_KEY`, model, temperature). Default dev: `mock` agar Phase 1-2 jalan tanpa key.

## 2. Pipeline

```
UI input (natural language + page context)
 → AIService.validateInput
 → ContextBuilder (permission check + data minimization: hanya slice relevan)
 → Memory (user_pref, teacher_context, conversation_summary; bukan full history permanen)
 → RAG Retriever (pgvector top-k, jika ada knowledge)
 → PromptBuilder (system: role+jenjang+kurikulum; user data ditandai UNTRUSTED)
 → AIProvider
 → ResponseValidator (JSON Schema + Zod)
 → ActionExecutor (Preview → Confirm → Mutate + AuditLog)
```

## 3. Context Engine

Input konteks: teacher, school, level, grade, subject, class, curriculum, year, semester, students (agregat, bukan full PII bila tidak perlu), goals, plans, materials, knowledge base, school policies.

Contoh: "Buatkan soal untuk kelas saya" → AI harus minta klarifikasi terstruktur (materi, tujuan, jumlah, difficulty, tipe asesmen) jika konteks kosong, bukan langsung generate.

## 4. Action system

```json
{ "intent": "create_lesson_plan", "actions": [{ "type": "create_lesson_plan" }, { "type": "create_assessment" }] }
```

Klasifikasi risiko:

* Low (draft, ringkas, brainstorm): preview langsung.
* High (ubah/hapus data siswa, nilai, kirim komunikasi, bulk): wajib konfirmasi eksplisit + audit `ai_approved / ai_rejected`.

AI tidak boleh eksekusi SQL langsung, tidak boleh ubah DB tanpa validator.

## 5. Guardrails

* Schema validation (Zod/JSON Schema), content validation, context validation, policy validation.
* Prompt-injection: dokumen upload selalu dibungkus sebagai DATA, instruksi di dalamnya diabaikan. Test: PDF berisi "Ignore previous instructions" harus diperlakukan sebagai teks.
* Data minimization: "Analisis nilai kelas 5" hanya kirim agregat + ID yang perlu, bukan seluruh DB.
* Memory policy: ringkas percakapan > N pesan, hapus PII dari memory permanen.
* Eval dataset: `tests/ai/*.eval.js` berisi {prompt, expected intent, context, action, output structure} + uji hallucination, invalid action, missing context, permission violation, injection, malformed output.

## 6. RAG

```
Document → Parser → Chunking (500-800 token, overlap) → Embedding → pgvector → Retrieval → Context → LLM → Answer + citations
```

MVP Phase 4: parser PDF/DOCX/TXT, embedding via provider atau mock, semantic search dengan filter `(teacher_id, subject, level)`.
