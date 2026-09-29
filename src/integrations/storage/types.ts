/** Object storage abstraction. App code depends on this interface only. */

export interface StorageBackend {
  name: "s3" | "supabase";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Time-limited access URL. */
  getSignedUrl(key: string, expiresSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

export class StorageUnconfiguredError extends Error {
  constructor() {
    super("Object storage belum dikonfigurasi. Isi S3_* di .env, atau gunakan Supabase (otomatis bila Supabase dikonfigurasi).");
  }
}

export function safeFilename(name: string): string {
  const base = name.split("/").pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

/** Pure key builder: teacher-os/<owner>/<kind>/<yyyymm>/<uuid>-<safe-name>. */
export function buildKey(ownerId: string, kind: string, filename: string, id: string, now = new Date()): string {
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `teacher-os/${ownerId}/${kind}/${ym}/${id}-${safeFilename(filename)}`;
}
