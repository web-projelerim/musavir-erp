import { describe, expect, it } from "vitest";
import { riskSeviyesiFromSkor } from "@/lib/domain/risk";
import { buildMusteriImportPreview } from "@/lib/domain/excelImport";
import type { Musteri } from "@/lib/types";

describe("riskSeviyesiFromSkor", () => {
  it("eşik değerlerini doğru sınıflandırır", () => {
    expect(riskSeviyesiFromSkor(0)).toBe("dusuk");
    expect(riskSeviyesiFromSkor(24)).toBe("dusuk");
    expect(riskSeviyesiFromSkor(25)).toBe("orta");
    expect(riskSeviyesiFromSkor(49)).toBe("orta");
    expect(riskSeviyesiFromSkor(50)).toBe("yuksek");
    expect(riskSeviyesiFromSkor(74)).toBe("yuksek");
    expect(riskSeviyesiFromSkor(75)).toBe("kritik");
    expect(riskSeviyesiFromSkor(100)).toBe("kritik");
  });
});

describe("buildMusteriImportPreview", () => {
  const mevcut: Musteri[] = [
    { id: "m1", vknTckn: "1234567890" } as Musteri,
  ];

  it("geçerli yeni kayıt 'create'", () => {
    const p = buildMusteriImportPreview(
      [{ firmaAdi: "Yeni AŞ", vknTckn: "9999999999" } as never],
      mevcut
    );
    expect(p[0].decision).toBe("create");
    expect(p[0].errors).toHaveLength(0);
  });

  it("mevcut VKN 'update'", () => {
    const p = buildMusteriImportPreview(
      [{ firmaAdi: "Var AŞ", vknTckn: "1234567890" } as never],
      mevcut
    );
    expect(p[0].decision).toBe("update");
    expect(p[0].existingMusteriId).toBe("m1");
  });

  it("dosya içinde tekrar eden VKN 'invalid'", () => {
    const p = buildMusteriImportPreview(
      [
        { firmaAdi: "A", vknTckn: "5555555555" } as never,
        { firmaAdi: "B", vknTckn: "5555555555" } as never,
      ],
      []
    );
    expect(p[1].decision).toBe("invalid");
    expect(p[1].errors.join()).toContain("tekrar eden");
  });

  it("hatalı VKN uzunluğu uyarı üretir (eksik)", () => {
    const p = buildMusteriImportPreview(
      [{ firmaAdi: "Kısa", vknTckn: "123" } as never],
      []
    );
    expect(p[0].errors.join()).toContain("10 veya 11");
    expect(p[0].decision).toBe("eksik");
  });

  it("hatalı e-posta uyarı üretir", () => {
    const p = buildMusteriImportPreview(
      [{ firmaAdi: "X", vknTckn: "1111111111", email: "bozuk" } as never],
      []
    );
    expect(p[0].errors.join()).toContain("E-posta");
  });
});
