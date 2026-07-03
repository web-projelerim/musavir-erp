import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Genel AES-256-GCM şifreleme yardımcısı.
 * GİB IVD pattern'inin (lib/integrations/gib/encrypt.ts) genelleştirilmiş hali.
 * Kullanım: SGK/e-Bildirge/e-Devlet/banka şifreleri için.
 *
 * Gerekli env: SECRET_KEY (en az 32 karakter)
 * Backwards compat: SECRET_KEY yoksa GIB_SECRET_KEY denenir.
 */

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const SALT = "musavir-erp-secrets-v1";

function getKey(): Buffer {
  const raw = process.env.SECRET_KEY ?? process.env.GIB_SECRET_KEY ?? "";
  if (!raw) throw new Error("SECRET_KEY (veya GIB_SECRET_KEY) env değişkeni tanımlanmamış");
  return scryptSync(raw, SALT, 32) as Buffer;
}

/** Plaintext → "iv:tag:cipher" hex string */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** "iv:tag:cipher" hex string → plaintext */
export function decryptSecret(token: string): string {
  if (!token) return "";
  const parts = token.split(":");
  if (parts.length !== 3) throw new Error("Geçersiz şifreli format");
  const [ivHex, tagHex, cipherHex] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(cipherHex, "hex")).toString("utf8") + decipher.final("utf8");
}

/**
 * Bir credential field'ı şifrelenmiş veya değil olabilir — tanımak için yardımcı.
 * Uzunluk doğrulaması önemli: IV 12 bayt (24 hex), GCM tag 16 bayt (32 hex).
 * Aksi halde "ab:12:ef" gibi kısa düz metinler yanlışlıkla şifreli sanılıp
 * şifrelenmeden saklanabilirdi.
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [iv, tag, cipher] = parts;
  return (
    iv.length === IV_LEN * 2 && /^[0-9a-f]+$/i.test(iv) &&
    tag.length === 32 && /^[0-9a-f]+$/i.test(tag) &&
    cipher.length > 0 && cipher.length % 2 === 0 && /^[0-9a-f]+$/i.test(cipher)
  );
}
