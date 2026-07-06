import { describe, expect, it } from "vitest";
import { donemAraligiHesapla, donemIcindeMi } from "@/lib/utils/donem";

describe("donemAraligiHesapla", () => {
  it("aylık dönem için ayın ilk ve son gününü hesaplar", () => {
    const aralik = donemAraligiHesapla("aylik", "2026-02", "2026");
    expect(aralik).not.toBeNull();
    expect(aralik!.baslangic.slice(0, 10)).toBe("2026-02-01");
    expect(aralik!.bitis.slice(0, 10)).toBe("2026-02-28"); // 2026 artık yıl değil
  });

  it("artık yılda Şubat 29 gün olarak hesaplanır", () => {
    const aralik = donemAraligiHesapla("aylik", "2024-02", "2024");
    expect(aralik!.bitis.slice(0, 10)).toBe("2024-02-29");
  });

  it("yıllık dönem için Ocak 1 - Aralık 31 aralığını hesaplar", () => {
    const aralik = donemAraligiHesapla("yillik", "2026-07", "2026");
    expect(aralik!.baslangic.slice(0, 10)).toBe("2026-01-01");
    expect(aralik!.bitis.slice(0, 10)).toBe("2026-12-31");
  });

  it("geçersiz girdi için null döner", () => {
    expect(donemAraligiHesapla("aylik", "", "2026")).toBeNull();
    expect(donemAraligiHesapla("yillik", "2026-07", "")).toBeNull();
  });
});

describe("donemIcindeMi", () => {
  const { baslangic, bitis } = donemAraligiHesapla("aylik", "2026-07", "2026")!;

  it("aralık içindeki tarihi kabul eder", () => {
    expect(donemIcindeMi("2026-07-15", baslangic, bitis)).toBe(true);
    expect(donemIcindeMi("2026-07-15T00:00:00.000Z", baslangic, bitis)).toBe(true);
  });

  it("aralık dışındaki tarihi reddeder", () => {
    expect(donemIcindeMi("2026-06-30", baslangic, bitis)).toBe(false);
    expect(donemIcindeMi("2026-08-01", baslangic, bitis)).toBe(false);
  });

  it("aralık verilmemişse (eski rapor kayıtları) her zaman true döner", () => {
    expect(donemIcindeMi("2020-01-01")).toBe(true);
    expect(donemIcindeMi(undefined)).toBe(true);
  });

  it("aralık verilmiş ama tarih eksikse false döner", () => {
    expect(donemIcindeMi(undefined, baslangic, bitis)).toBe(false);
  });
});
