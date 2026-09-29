import { getSchoolContext } from "@/lib/school";
import SetupNotice from "@/components/setup-notice";
import { BLOOM_LEVELS, DIFFICULTIES, QUESTION_TYPES } from "@/modules/teaching/schemas";
import { ContextNote, Field, FormError, inputCls } from "@/components/ui";
import { createBank, createQuestion } from "@/modules/questions/actions";

export default async function QuestionsPage({ searchParams }: { searchParams: { error?: string } }) {
  const res = await getSchoolContext();
  if (!res.ok) {
    if (res.reason === "setup") {
      return (
        <main className="p-8"><h1 className="text-2xl font-semibold">Question Bank</h1><div className="mt-4 max-w-2xl"><SetupNotice /></div></main>
      );
    }
    return <ContextNote reason={res.reason} message={res.message} />;
  }
  const { supabase, schoolId } = res.ctx;

  const [{ data: banks }, { data: questions }] = await Promise.all([
    supabase
      .from("question_banks")
      .select("id, title, subject, grade, topic")
      .eq("school_id", schoolId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("questions")
      .select("id, bank_id, question_type, difficulty, bloom_level, content")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const byBank = new Map<string, NonNullable<typeof questions>>();
  for (const q of questions ?? []) {
    const list = byBank.get(q.bank_id) ?? [];
    list.push(q);
    byBank.set(q.bank_id, list);
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Question Bank</h1>
      <p className="mt-1 text-sm text-gray-600">Bank soal per topik beserta kunci dan pembahasan.</p>
      <FormError message={searchParams.error} />

      <form action={createBank} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Buat bank soal</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Judul bank" htmlFor="btitle">
            <input id="btitle" name="title" required placeholder="cth. IPA Kelas 5 - Ekosistem" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Mapel" htmlFor="bsubject">
            <input id="bsubject" name="subject" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tingkat" htmlFor="bgrade">
            <input id="bgrade" name="grade" className={inputCls} autoComplete="off" />
          </Field>
          <Field label="Topik" htmlFor="btopic">
            <input id="btopic" name="topic" className={inputCls} autoComplete="off" />
          </Field>
        </div>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Buat Bank</button>
      </form>

      <form action={createQuestion} className="mt-4 max-w-xl space-y-3 rounded border p-4">
        <p className="font-medium">Tambah soal</p>
        <Field label="Bank soal" htmlFor="bankId">
          <select id="bankId" name="bankId" required className={inputCls} defaultValue="">
            <option value="">Pilih bank</option>
            {(banks ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tipe" htmlFor="qtype">
            <select id="qtype" name="questionType" className={inputCls} defaultValue="pilihan_ganda">
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Sulit" htmlFor="qdiff">
            <select id="qdiff" name="difficulty" className={inputCls} defaultValue="sedang">
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Bloom" htmlFor="qbloom">
            <select id="qbloom" name="bloomLevel" className={inputCls} defaultValue="">
              <option value="">-</option>
              {BLOOM_LEVELS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Isi soal" htmlFor="qcontent">
          <textarea id="qcontent" name="content" required rows={3} className={inputCls} />
        </Field>
        <Field label="Kunci jawaban (opsional)" htmlFor="qanswer">
          <textarea id="qanswer" name="answer" rows={2} className={inputCls} />
        </Field>
        <Field label="Pembahasan (opsional)" htmlFor="qexp">
          <textarea id="qexp" name="explanation" rows={2} className={inputCls} />
        </Field>
        <button type="submit" className="rounded bg-black px-4 py-2 text-sm text-white">Simpan Soal</button>
      </form>

      <div className="mt-6 max-w-3xl space-y-4">
        {(banks ?? []).length === 0 && (
          <p className="rounded border p-6 text-center text-sm text-gray-600">Belum ada bank soal.</p>
        )}
        {(banks ?? []).map((b) => (
          <section key={b.id} className="rounded border p-4">
            <p className="font-medium">{b.title}</p>
            <p className="text-xs text-gray-500">{[b.subject, b.grade, b.topic].filter(Boolean).join(" · ")}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {(byBank.get(b.id) ?? []).map((q) => (
                <li key={q.id} className="rounded border px-3 py-2">
                  <p className="whitespace-pre-wrap">{q.content}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {[q.question_type, q.difficulty, q.bloom_level].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
              {(byBank.get(b.id) ?? []).length === 0 && (
                <li className="text-sm text-gray-600">Belum ada soal di bank ini.</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
