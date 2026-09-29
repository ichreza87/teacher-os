import pg from "pg";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { loadEnvFile } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...loadEnvFile(root), ...process.env };
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi DATABASE_URL.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const sql = readFileSync(join(root, "src", "db", "seed", "seed_dev.sql"), "utf8");
try {
  await client.query(sql);
  console.log("Seed dummy diterapkan (idempoten: baris yang sudah ada dilewati).");
  console.log("Langkah berikutnya: buat 3 auth user di Supabase Dashboard, lalu klaim baris guru:");
  console.log("  update teachers set user_id = '<auth-user-uuid>' where id = '<teacher-uuid>';");
} catch (e) {
  console.error(`Seed gagal: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
