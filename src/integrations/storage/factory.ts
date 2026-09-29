import type { SupabaseClient } from "@supabase/supabase-js";
import { S3Backend, isS3Configured, type S3Env } from "./s3";
import { SupabaseStorageBackend } from "./supabase-storage";
import { StorageUnconfiguredError, type StorageBackend } from "./types";

export interface StorageEnv extends S3Env {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  [key: string]: string | undefined;
}

/** Backend selection: S3 when S3_* is set, else Supabase Storage when
 *  Supabase is configured, else an honest error (no silent local-fake). */
export function getStorageBackend(
  supabase?: SupabaseClient,
  env: StorageEnv = process.env
): StorageBackend {
  if (isS3Configured(env)) return new S3Backend(env);
  if (supabase && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new SupabaseStorageBackend(supabase);
  }
  throw new StorageUnconfiguredError();
}
