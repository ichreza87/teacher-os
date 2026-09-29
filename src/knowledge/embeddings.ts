/** Single embedding width for the whole app (pgvector column + all providers).
 *  1536 matches text-embedding-3-small; the mock provider pads deterministically. */
export const EMBEDDING_DIM = 1536;

export const DEFAULT_EMBED_MODEL = "text-embedding-3-small";

/** pgvector text format: '[0.1,0.2,...]'. */
export function toVectorLiteral(values: number[]): string {
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(`Dimensi embedding salah: ${values.length}, harus ${EMBEDDING_DIM}.`);
  }
  return `[${values.join(",")}]`;
}
