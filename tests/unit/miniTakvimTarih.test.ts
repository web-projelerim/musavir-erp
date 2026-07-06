import { describe, expect, it } from "vitest";
import { isoToLocalDateStr } from "@/lib/utils/takvimTarih";

describe("isoToLocalDateStr", () => {
  it("tarih-only ISO string'i olduğu gibi döner", () => {
    expect(isoToLocalDateStr("2026-07-31")).toBe("2026-07-31");
  });

  it("ay sonu tam zaman damgasını (geç UTC saatinde) kaydırmadan doğru günde tutar", () => {
    // Pozitif UTC ofsetli saat dilimlerinde eski implementasyon (new Date + yerel bileşen)
    // bu tarihi 2026-08-01'e kaydırabiliyordu — artık ilk 10 karakter doğrudan alınıyor.
    expect(isoToLocalDateStr("2026-07-31T22:00:00.000Z")).toBe("2026-07-31");
  });

  it("ayın ilk günü de doğru kalır (gece yarısına yakın erken UTC saati)", () => {
    expect(isoToLocalDateStr("2026-08-01T00:30:00.000Z")).toBe("2026-08-01");
  });

  it("geçersiz tarih için boş string döner", () => {
    expect(isoToLocalDateStr("gecersiz-tarih")).toBe("");
  });
});
