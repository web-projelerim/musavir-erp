import { describe, expect, it } from "vitest";
import {
  hesaplaKdv2,
  TEVKIFAT_MAP,
  TEVKIFAT_TURLERI,
  tevkifatOrani,
  tevkifatOranEtiketi,
} from "@/lib/domain/tevkifat";

describe("tevkifat katalogu", () => {
  it("tüm türlerin geçerli pay/payda ve etiketi var", () => {
    for (const t of TEVKIFAT_TURLERI) {
      expect(t.pay).toBeGreaterThan(0);
      expect(t.payda).toBe(10);
      expect(t.pay).toBeLessThanOrEqual(10);
      expect(t.label).toBeTruthy();
    }
  });

  it("key'ler benzersiz", () => {
    const keys = TEVKIFAT_TURLERI.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("2/10–10/10 aralığında oranlar mevcut (tam liste)", () => {
    const oranlar = new Set(TEVKIFAT_TURLERI.map((t) => t.pay));
    // En az bu resmi oranlar temsil edilmeli
    for (const p of [4, 5, 7, 9, 10]) {
      expect(oranlar.has(p)).toBe(true);
    }
  });
});

describe("tevkifatOrani / etiket", () => {
  it("9/10 → 0.9, etiket '9/10'", () => {
    const key = TEVKIFAT_TURLERI.find((t) => t.pay === 9)!.key;
    expect(tevkifatOrani(key)).toBeCloseTo(0.9);
    expect(tevkifatOranEtiketi(key)).toBe("9/10");
  });

  it("bilinmeyen key → 0 ve '-'", () => {
    expect(tevkifatOrani("yok")).toBe(0);
    expect(tevkifatOranEtiketi("yok")).toBe("-");
  });

  it("MAP tüm türleri içerir", () => {
    expect(Object.keys(TEVKIFAT_MAP).length).toBe(TEVKIFAT_TURLERI.length);
  });
});

describe("hesaplaKdv2", () => {
  it("100.000 matrah, %20 KDV, 9/10 tevkifat", () => {
    const key = "temizlik"; // 9/10
    const r = hesaplaKdv2(100_000, 20, key);
    expect(r.kdvTutari).toBe(20_000);
    expect(r.tevkifEdilenKdv).toBe(18_000); // 20.000 × 9/10
    expect(r.saticiyaOdenenKdv).toBe(2_000);
    expect(r.faturaToplam).toBe(102_000); // matrah + satıcıya kalan KDV
  });

  it("50.000 matrah, %20 KDV, 5/10 tevkifat", () => {
    const r = hesaplaKdv2(50_000, 20, "yemek_servis"); // 5/10
    expect(r.kdvTutari).toBe(10_000);
    expect(r.tevkifEdilenKdv).toBe(5_000);
    expect(r.saticiyaOdenenKdv).toBe(5_000);
    expect(r.faturaToplam).toBe(55_000);
  });

  it("tam tevkifat (10/10): tüm KDV alıcıya geçer", () => {
    const r = hesaplaKdv2(10_000, 20, "tam_tevkifat");
    expect(r.tevkifEdilenKdv).toBe(2_000);
    expect(r.saticiyaOdenenKdv).toBe(0);
    expect(r.faturaToplam).toBe(10_000);
  });

  it("negatif matrah 0'a sabitlenir", () => {
    const r = hesaplaKdv2(-1000, 20, "temizlik");
    expect(r.kdvTutari).toBe(0);
    expect(r.tevkifEdilenKdv).toBe(0);
  });

  it("geçersiz tevkifat türünde tevkifat 0 (tüm KDV satıcıya)", () => {
    const r = hesaplaKdv2(1000, 20, "yok");
    expect(r.tevkifEdilenKdv).toBe(0);
    expect(r.saticiyaOdenenKdv).toBe(200);
  });
});
