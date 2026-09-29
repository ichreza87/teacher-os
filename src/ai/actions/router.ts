import type { ActionType } from "./schemas";

export type Intent = ActionType | "none" | "help" | "unsupported" | "parent_message";

export interface DetectedIntent {
  intent: Intent;
  /** Pre-filled slots extracted from the message. */
  slots: Record<string, string>;
  /** Required slots still missing → assistant asks a structured clarification. */
  missing: string[];
}

interface RouterContext {
  classes: { id: string; name: string }[];
  subject: string | null;
}

/** NOTE: order matters. Reminder verbs are checked first: an explicit
 *  "ingatkan saya ..." framing wins over content nouns like "ulangan",
 *  because the user asks for a reminder, not an assessment. */
const PATTERNS: { intent: ActionType; keywords: string[] }[] = [
  { intent: "create_task", keywords: ["ingatkan", "pengingat", "todo", "to do", "jangan lupa", "catat"] },
  { intent: "create_assessment", keywords: ["soal", "asesmen", "ulangan", "ujian", "kuis", "quiz", "sumatif", "formatif"] },
  { intent: "create_lesson_plan", keywords: ["modul", "rpp", "lesson plan", "rencana pembelajaran", "perangkat pembelajaran"] },
  { intent: "create_material", keywords: ["materi", "bahan ajar", "bacaan", "lembar kerja", "worksheet"] },
  { intent: "create_event", keywords: ["jadwal", "agenda", "rapat", "acara", "kalender", "pertemuan "] },
];
function findClass(text: string, classes: RouterContext["classes"]): { id: string; name: string } | null {
  const t = text.toLowerCase().replace(/\s+/g, "");
  // Match "kelas 5a" or bare "5a"/"5 a".
  for (const c of classes) {
    const n = c.name.toLowerCase().replace(/\s+/g, "");
    if (t.includes(n) || t.includes(`kelas${n}`)) return c;
  }
  return null;
}

function extractTopic(text: string): string {
  const m = text.match(/tentang\s+([^.,;!?]+)/i) ?? text.match(/materi\s+([a-zA-Z][^.,;!?]{2,60})/i);
  return (m?.[1] ?? "").trim();
}

/** Keyword router: deterministic, testable, no LLM needed for intent.
 *  Injection embedded in the message is treated as plain text — it can only
 *  influence slots, never the action type set. */
export function detectIntent(input: string, ctx: RouterContext): DetectedIntent {
  const text = input.toLowerCase();

  if (/(bisa apa|bantuan|help|cara pakai|mulai dari mana)/.test(text)) {
    return { intent: "help", slots: {}, missing: [] };
  }
  if (/(ringkas|upload|pdf|dokumen saya|scan|ocr)/.test(text)) {
    return { intent: "unsupported", slots: {}, missing: [] };
  }
  if (/(orang tua|wali murid|pesan ke orang|info orang tua|komunikasi orang tua|surat orang tua)/.test(text)) {
    return { intent: "parent_message", slots: {}, missing: [] };
  }

  let intent: ActionType | null = null;
  for (const p of PATTERNS) {
    if (p.keywords.some((k) => text.includes(k))) {
      intent = p.intent;
      break;
    }
  }
  if (!intent) return { intent: "none", slots: {}, missing: [] };

  const slots: Record<string, string> = {};
  const missing: string[] = [];
  const cls = findClass(input, ctx.classes);

  switch (intent) {
    case "create_assessment": {
      if (cls) slots.classId = cls.id;
      else if (ctx.classes.length === 1) slots.classId = ctx.classes[0].id;
      else missing.push("classId");
      const topic = extractTopic(input);
      slots.title = topic ? `Asesmen ${topic}` : "Asesmen baru";
      break;
    }
    case "create_lesson_plan": {
      const topic = extractTopic(input);
      if (topic) slots.topic = topic;
      else missing.push("topic");
      if (ctx.subject) slots.subject = ctx.subject;
      else missing.push("subject");
      if (cls) slots.classId = cls.id;
      break;
    }
    case "create_material": {
      const topic = extractTopic(input);
      slots.title = topic ? `Materi ${topic}` : input.trim().slice(0, 80);
      if (!topic) missing.push("title");
      break;
    }
    case "create_task": {
      slots.title = input.trim().slice(0, 200);
      break;
    }
    case "create_event": {
      slots.title = input.trim().slice(0, 120);
      missing.push("startsAt");
      break;
    }
  }
  return { intent, slots, missing };
}

/** Structured clarification question for missing slots. */
export function clarificationQuestion(d: DetectedIntent, classes: RouterContext["classes"]): string {
  if (d.missing.includes("classId")) {
    const opts = classes.map((c) => c.name).join(", ");
    return `Untuk kelas mana? Pilihan Anda: ${opts || "belum ada kelas — buat kelas dulu di menu Classes"}.`;
  }
  if (d.missing.includes("topic")) return "Topik pembelajarannya apa? Contoh: ekosistem, pecahan, teks deskripsi.";
  if (d.missing.includes("subject")) return "Mata pelajarannya apa?";
  if (d.missing.includes("title")) return "Judul materinya apa?";
  if (d.missing.includes("startsAt")) return "Kapan waktunya? Tulis tanggal dan jam, mis. 5 Okt 2026 09:00.";
  return "Bisa jelaskan lebih detail?";
}
