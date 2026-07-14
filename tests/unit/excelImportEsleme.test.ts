import { describe, expect, it } from "vitest";
import { buildMusteriImportPreview, type MusteriImportRow } from "@/lib/domain/excelImport";
import type { Musteri } from "@/lib/types";

function row(partial: Partial<MusteriImportRow>): MusteriImportRow {
  return {
    rowNumber: 2,
    kisaAd: "",
    firmaAdi: "",
    vknTckn: "",
    vergiDairesi: "",
    kurulusTarihi: "",
    aciklama: "",
    yetkiliAd: "",
    telefon: "",
    email: "",
    adres: "",
    sorumluPersonel: "",
    kdvMukellef: false,
    muhtasarMukellef: false,
    ...partial,
  };
}

function musteri(partial: Partial<Musteri>): Musteri {
  return { id: "m1", firmaAdi: "", vknTckn: "", yetkiliAd: "", ...partial } as Musteri;
}

describe("buildMusteriImportPreview — eşleştirme", () => {
  it("geçerli VKN birebir eşleşince günceller", () => {
    const existing = [musteri({ id: "x", vknTckn: "1234567890", firmaAdi: "Akdeniz Tekstil" })];
    const [p] = buildMusteriImportPreview([row({ firmaAdi: "Akdeniz Tekstil", vknTckn: "1234567890" })], existing);
    expect(p.decision).toBe("update");
    expect(p.existingMusteriId).toBe("x");
  });

  it("boş VKN, mevcut boş-VKN'li müşteriyle ESLEŞMEZ (sahte güncelleme yok)", () => {
    const existing = [musteri({ id: "bos", vknTckn: "", firmaAdi: "Baska Firma" })];
    const [p] = buildMusteriImportPreview([row({ firmaAdi: "Yeni Firma" })], existing);
    expect(p.existingMusteriId).toBeUndefined();
    expect(p.decision).not.toBe("update");
  });

  it("kişi (yetkili) adıyla eşleşir — şahıs mükellef", () => {
    const existing = [musteri({ id: "sahis", vknTckn: "12345678901", firmaAdi: "Ahmet Yılmaz", yetkiliAd: "Ahmet Yılmaz" })];
    // VKN olmayan, sadece kişi adı taşıyan satır mevcut yetkiliAd ile eşleşmeli
    const [p] = buildMusteriImportPreview([row({ yetkiliAd: "Ahmet Yılmaz" })], existing);
    expect(p.decision).toBe("update");
    expect(p.existingMusteriId).toBe("sahis");
  });

  it("firma adıyla eşleşir (VKN yokken)", () => {
    const existing = [musteri({ id: "f", vknTckn: "9998887776", firmaAdi: "Deniz Gıda Ltd Şti" })];
    const [p] = buildMusteriImportPreview([row({ firmaAdi: "Deniz Gıda Ltd Şti" })], existing);
    expect(p.decision).toBe("update");
    expect(p.existingMusteriId).toBe("f");
  });

  it("ne isim ne VKN olan satır 'invalid' — içe aktarılamaz (banka ekstresi gibi)", () => {
    const [p] = buildMusteriImportPreview([row({})], []);
    expect(p.decision).toBe("invalid");
  });

  it("yeni geçerli VKN + isim → create", () => {
    const [p] = buildMusteriImportPreview([row({ firmaAdi: "Sıfır Firma", vknTckn: "1112223334" })], []);
    expect(p.decision).toBe("create");
  });
});
