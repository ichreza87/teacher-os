import pg from "pg";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResetSql, loadEnvFile, requireResetConfirmation } from "./lib.mjs";

try {
  requireResetConfirmation(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...loadEnvFile(root), ...process.env };
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL belum diisi.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(buildResetSql());
  console.log("Reset selesai: semua tabel Teacher OS dihapus.");
} catch (e) {
  console.error(`Reset gagal: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
