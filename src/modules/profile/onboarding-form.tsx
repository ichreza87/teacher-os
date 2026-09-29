"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLevelCodes, getLevelConfig } from "@/config/levels";
import {
  TEACHER_ROLES,
  validateStep,
  type OnboardingData,
  type OnboardingStep,
} from "@/modules/profile/onboarding-schema";
import { completeOnboarding } from "@/app/onboarding/actions";

const STEP_TITLES: Record<OnboardingStep, string> = {
  1: "Siapa nama Anda?",
  2: "Jenjang apa yang Anda ajar?",
  3: "Di sekolah mana Anda mengajar?",
  4: "Mata pelajaran dan peran Anda?",
  5: "Kelas yang Anda ampu (opsional)",
  6: "Kurikulum yang dipakai?",
  7: "Tahun ajaran aktif?",
  8: "Pilih AI provider",
};

const inputCls = "mt-1 w-full rounded border px-3 py-2";

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<Partial<OnboardingData>>({ aiProvider: "mock", role: "guru_mapel" });
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<OnboardingData | null>(null);

  function set<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function next() {
    const payload = stepPayload();
    const r = validateStep(step, payload);
    if (!r.success) {
      setStepError(r.error.issues[0]?.message ?? "Isian belum valid.");
      return;
    }
    setStepError(null);
    if (step === 8) {
      void submit();
      return;
    }
    setStep((step + 1) as OnboardingStep);
  }

  function stepPayload(): unknown {
    switch (step) {
      case 1:
        return { fullName: data.fullName ?? "" };
      case 2:
        return { level: data.level ?? "" };
      case 3:
        return { schoolName: data.schoolName ?? "" };
      case 4:
        return { subject: data.subject ?? "", role: data.role ?? "" };
      case 5:
        return { className: data.className ?? "" };
      case 6:
        return { curriculum: data.curriculum ?? "" };
      case 7:
        return { academicYear: data.academicYear ?? "" };
      case 8:
        return { aiProvider: data.aiProvider ?? "" };
    }
  }

  async function submit() {
    setSaving(true);
    setSubmitError(null);
    const r = await completeOnboarding(data);
    setSaving(false);
    if (!r.ok) {
      setSubmitError(r.error);
      return;
    }
    setDone(data as OnboardingData);
  }

  if (done) {
    const cfg = getLevelConfig(done.level);
    return (
      <div>
        <h2 className="text-xl font-semibold">Saya sudah memahami konteks dasar Anda.</h2>
        <div className="mt-4 rounded border p-4">
          <p className="font-medium">Your Teaching Context</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Nama</dt><dd>{done.fullName}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Jenjang</dt><dd>{cfg.name}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Sekolah</dt><dd>{done.schoolName}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Mapel/Peran</dt><dd>{done.subject} · {done.role}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Kelas</dt><dd>{done.className || "-"}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Kurikulum</dt><dd>{done.curriculum}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Tahun ajaran</dt><dd>{done.academicYear}</dd></div>
          </dl>
        </div>
        <div className="mt-4 rounded border p-4">
          <p className="font-medium">Recommended Setup</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            <li>Buat {cfg.terminology.lessonPlan} pertama untuk {cfg.terminology.classUnit} Anda (Phase 2).</li>
            <li>Siapkan {cfg.terminology.assessment} tipe: {cfg.assessmentTypes.join(", ")} (Phase 2).</li>
            <li>Tambahkan data siswa setelah modul Students tersedia (Phase 2).</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-4 rounded bg-black px-4 py-2 text-white"
        >
          Buka Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500">Langkah {step} dari 8</p>
      <h2 className="mt-1 text-xl font-semibold">{STEP_TITLES[step]}</h2>

      <div className="mt-4">
        {step === 1 && (
          <input aria-label="Nama lengkap" className={inputCls} value={data.fullName ?? ""}
            onChange={(e) => set("fullName", e.target.value)} placeholder="cth. Ibu Guru" />
        )}
        {step === 2 && (
          <select aria-label="Jenjang" className={inputCls} value={data.level ?? ""}
            onChange={(e) => set("level", e.target.value as OnboardingData["level"])}>
            <option value="">Pilih jenjang</option>
            {getLevelCodes().map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {step === 3 && (
          <input aria-label="Nama sekolah" className={inputCls} value={data.schoolName ?? ""}
            onChange={(e) => set("schoolName", e.target.value)} placeholder="cth. SD Contoh Ceria" />
        )}
        {step === 4 && (
          <div className="space-y-3">
            <input aria-label="Mata pelajaran atau peran" className={inputCls} value={data.subject ?? ""}
              onChange={(e) => set("subject", e.target.value)} placeholder="cth. Matematika" />
            <select aria-label="Peran" className={inputCls} value={data.role ?? "guru_mapel"}
              onChange={(e) => set("role", e.target.value as OnboardingData["role"])}>
              {TEACHER_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
        {step === 5 && (
          <input aria-label="Kelas" className={inputCls} value={data.className ?? ""}
            onChange={(e) => set("className", e.target.value)} placeholder="cth. 5A (boleh kosong)" />
        )}
        {step === 6 && (
          <input aria-label="Kurikulum" className={inputCls} value={data.curriculum ?? ""}
            onChange={(e) => set("curriculum", e.target.value)} placeholder="cth. Merdeka" list="curricula" />
        )}
        {step === 7 && (
          <input aria-label="Tahun ajaran" className={inputCls} value={data.academicYear ?? ""}
            onChange={(e) => set("academicYear", e.target.value)} placeholder="2026/2027" />
        )}
        {step === 8 && (
          <select aria-label="AI provider" className={inputCls} value={data.aiProvider ?? "mock"}
            onChange={(e) => set("aiProvider", e.target.value as OnboardingData["aiProvider"])}>
            <option value="mock">Mock (tanpa API key, untuk coba-coba)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
            <option value="local">Local model</option>
          </select>
        )}
      </div>

      {stepError && <p role="alert" className="mt-2 text-sm text-red-600">{stepError}</p>}
      {submitError && <p role="alert" className="mt-2 text-sm text-red-600">{submitError}</p>}

      <div className="mt-4 flex gap-2">
        {step > 1 && (
          <button type="button" onClick={() => setStep((step - 1) as OnboardingStep)}
            className="rounded border px-4 py-2">
            Kembali
          </button>
        )}
        <button type="button" onClick={next} disabled={saving}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
          {saving ? "Menyimpan..." : step === 8 ? "Selesai" : "Lanjut"}
        </button>
      </div>
    </div>
  );
}
