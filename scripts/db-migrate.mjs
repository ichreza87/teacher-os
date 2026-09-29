import pg from "pg";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listMigrationFiles, loadEnvFile, readMigrationFile } from "./lib.mjs";

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
await client.query(`create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
)`);

const { rows: applied } = await client.query("select filename from schema_migrations");
const done = new Set(applied.map((r) => r.filename));
const migrationsDir = join(root, "src", "db", "migrations");

let count = 0;
for (const file of listMigrationFiles(migrationsDir)) {
  if (done.has(file)) {
    console.log(`lewati ${file} (sudah diterapkan)`);
    continue;
  }
  console.log(`terapkan ${file} ...`);
  const sql = readMigrationFile(migrationsDir, file);
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query("insert into schema_migrations (filename) values ($1)", [file]);
    await client.query("commit");
    console.log(`ok ${file}`);
    count++;
  } catch (e) {
    await client.query("rollback");
    console.error(`gagal ${file}: ${e.message}`);
    process.exitCode = 1;
    break;
  }
}

await client.end();
console.log(count === 0 ? "Tidak ada migrasi baru." : `${count} migrasi diterapkan.`);
