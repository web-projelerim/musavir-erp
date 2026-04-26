import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

function getKey(): Buffer {
  const raw = process.env.GIB_SECRET_KEY ?? "";
  if (!raw) throw new Error("GIB_SECRET_KEY env değişkeni tanımlanmamış");
  // Exactly 32 bytes: pad with zeros or truncate
  return Buffer.from(raw.padEnd(KEY_LEN, "0").slice(0, KEY_LEN), "utf8");
}

/** Plaintext → "iv:tag:cipher" hex string */
export function gibEncrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** "iv:tag:cipher" hex string → plaintext */
export function gibDecrypt(token: string): string {
  const parts = token.split(":");
  if (parts.length !== 3) throw new Error("Geçersiz şifreli format");
  const [ivHex, tagHex, cipherHex] = parts;
  const key = getKey();
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(cipherHex, "hex")).toString("utf8") + decipher.final("utf8");
}
