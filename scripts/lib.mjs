import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Minimal .env parser (KEY=VALUE, supports quotes + comments). Pure + tested. */
export function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadEnvFile(projectRoot, fs = { readFileSync }) {
  try {
    return parseEnv(fs.readFileSync(join(projectRoot, ".env"), "utf8"));
  } catch {
    return {};
  }
}

/** Discover migration files in order. Pure over injected file list (tested). */
export function discoverMigrations(files) {
  return files.filter((f) => f.endsWith(".sql")).sort();
}

export function readMigrationFile(migrationsDir, filename) {
  return readFileSync(join(migrationsDir, filename), "utf8");
}

export function listMigrationFiles(migrationsDir) {
  return discoverMigrations(readdirSync(migrationsDir));
}

// Tables in reverse dependency order for reset (CASCADE makes order defensive).
export const RESET_TABLES = [
  "workflow_runs", "workflow_rules", "school_documents", "professional_development",
  "communication_logs", "communication_templates",
  "files", "integration_secrets", "integrations",
  "generated_documents", "document_templates",
  "ai_actions", "ai_messages", "ai_conversations", "teacher_settings",
  "knowledge_chunks", "knowledge_documents",
  "calendar_events", "tasks", "rubrics", "assessment_results",
  "assessment_questions", "assessments", "questions", "question_banks",
  "materials", "lesson_plans", "learning_objectives",
  "enrollments", "parents", "students", "teacher_classes", "classes",
  "semesters", "academic_years", "teacher_schools", "teachers",
  "profiles", "schools", "education_levels", "audit_logs",
  "schema_migrations",
];

export function buildResetSql() {
  const drops = RESET_TABLES.map((t) => `drop table if exists ${t} cascade;`).join("\n");
  return [
    "delete from storage.objects where bucket_id = 'teacher-os-files';",
    "delete from storage.buckets where id = 'teacher-os-files';",
    "drop function if exists match_knowledge_chunks(vector, uuid, int);",
    "drop function if exists user_school_ids();",
    drops,
  ].join("\n");
}

/** Refuse destructive reset without explicit confirmation (human-in-the-loop). */
export function requireResetConfirmation(argv) {
  if (!argv.includes("--yes")) {
    throw new Error(
      "db:reset MENOLAK berjalan tanpa --yes. Ini menghapus SEMUA data Teacher OS. " +
      "Jalankan ulang dengan flag --yes bila Anda yakin (backup dulu)."
    );
  }
}
