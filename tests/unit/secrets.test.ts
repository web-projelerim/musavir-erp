import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isEncrypted } from "@/lib/security/secrets";

beforeAll(() => {
  process.env.SECRET_KEY = "vitest-icin-en-az-32-karakterlik-anahtar";
});

describe("secrets (AES-256-GCM)", () => {
  it("encrypt/decrypt roundtrip calisir", () => {
    const plain = "GIB-sifresi-Ünlü-çğışö-1234!";
    const enc = encryptSecret(plain);
    expect(enc).not.toBe(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("ayni plaintext her seferinde farkli ciphertext uretir (rastgele IV)", () => {
    const a = encryptSecret("aynidegermi");
    const b = encryptSecret("aynidegermi");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("bozulmus ciphertext auth tag hatasi verir (GCM butunluk)", () => {
    const enc = encryptSecret("bozulacak-veri");
    const [iv, tag, cipher] = enc.split(":");
    const flipped = cipher.slice(0, -1) + (cipher.endsWith("0") ? "1" : "0");
    expect(() => decryptSecret(`${iv}:${tag}:${flipped}`)).toThrow();
  });

  it("isEncrypted formati dogru tanir", () => {
    expect(isEncrypted(encryptSecret("x"))).toBe(true);
    expect(isEncrypted("duz-metin-sifre")).toBe(false);
    expect(isEncrypted("a:b:c")).toBe(false); // hex degil
    expect(isEncrypted(12345)).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });

  it("bos string bos doner", () => {
    expect(encryptSecret("")).toBe("");
    expect(decryptSecret("")).toBe("");
  });
});
