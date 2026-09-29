import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageBackend } from "./types";

export const SUPABASE_BUCKET = "teacher-os-files";

/** Supabase Storage fallback backend (bucket teacher-os-files, folder per owner).
 *  Disediakan agar dev lokal tetap bisa menyimpan berkas tanpa S3. */
export class SupabaseStorageBackend implements StorageBackend {
  name = "supabase" as const;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(key, body, { contentType, upsert: false });
    if (error) throw new Error(`Supabase Storage gagal: ${error.message}`);
  }

  async getSignedUrl(key: string, expiresSeconds = 900): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(key, expiresSeconds);
    if (error || !data) throw new Error(`Signed URL gagal: ${error?.message ?? "unknown"}`);
    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.supabase.storage.from(SUPABASE_BUCKET).remove([key]);
    if (error) throw new Error(`Hapus berkas gagal: ${error.message}`);
  }
}
