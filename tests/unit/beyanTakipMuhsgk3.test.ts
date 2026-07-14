import { describe, expect, it } from "vitest";
import { gorunurKolonlar, musteriKolonSorumlu } from "@/lib/domain/beyanTakip";
import type { Musteri } from "@/lib/types";

function musteri(vergiTurleri: Record<string, string>): Musteri {
  return { id: "m1", durum: "aktif", firmaAdi: "Test", vergiTurleri } as Musteri;
}

describe("MuhSGK 3 aylık (muhsgk3) beyanname takip", () => {
  const m = musteri({ muhsgk3: "mukellef" });

  it("müşteri muhsgk3 seçiliyse o kolondan sorumludur", () => {
    expect(musteriKolonSorumlu(m, "muhsgk3")).toBe(true);
    expect(musteriKolonSorumlu(m, "muhsgk")).toBe(false); // aylık değil
  });

  it("sadece beyan aylarında (Ocak/Nisan/Temmuz/Ekim) görünür", () => {
    for (const donem of ["2026-01", "2026-04", "2026-07", "2026-10"]) {
      const keys = gorunurKolonlar([m], donem).map((k) => k.key);
      expect(keys).toContain("muhsgk3");
    }
  });

  it("beyan olmayan aylarda görünmez", () => {
    for (const donem of ["2026-02", "2026-03", "2026-05", "2026-12"]) {
      const keys = gorunurKolonlar([m], donem).map((k) => k.key);
      expect(keys).not.toContain("muhsgk3");
    }
  });
});
