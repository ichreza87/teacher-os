import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** Token encryption for integration_secrets (AES-256-GCM).
 *  Key: sha256(APP_ENCRYPTION_KEY). Server-side only — never import in client components.
 *  Production recommendation: KMS/HSM instead of an env key. */

function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY belum diisi di server (.env). Integrasi yang butuh token tidak bisa dipakai.");
  }
  return createHash("sha256").update(raw).digest();
}

export interface SealedSecret {
  ciphertext: string;
  iv: string;
}

export function encryptSecret(plaintext: string): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([tag, enc]).toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decryptSecret(sealed: SealedSecret): string {
  const raw = Buffer.from(sealed.ciphertext, "hex");
  const tag = raw.subarray(0, 16);
  const enc = raw.subarray(16);
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(sealed.iv, "hex"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
