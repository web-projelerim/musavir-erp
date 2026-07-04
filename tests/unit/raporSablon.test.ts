import { describe, expect, it } from "vitest";
import {
  bolumAktif,
  bosSablon,
  RAPOR_BOLUM_LABELS,
  TUM_RAPOR_BOLUMLERI,
  varsayilanBolumler,
} from "@/lib/domain/raporSablon";
import type { RaporSablon } from "@/lib/types";

describe("varsayilanBolumler", () => {
  it("risk raporunda risk bölümü var", () => {
    expect(varsayilanBolumler("risk")).toContain("risk");
  });
  it("vergi_beyan'da beyannameler var, tahsilatlar yok", () => {
    const b = varsayilanBolumler("vergi_beyan");
    expect(b).toContain("beyannameler");
    expect(b).not.toContain("tahsilatlar");
  });
  it("her varsayılan bölüm geçerli bir bölüm key'i", () => {
    for (const tip of ["gelir_gider", "vergi_beyan", "operasyon", "risk"] as const) {
      for (const bol of varsayilanBolumler(tip)) {
        expect(TUM_RAPOR_BOLUMLERI).toContain(bol);
      }
    }
  });
});

describe("bolumAktif", () => {
  it("şablon yoksa tipin varsayılanına göre karar verir", () => {
    expect(bolumAktif(null, "risk", "risk")).toBe(true);
    expect(bolumAktif(null, "risk", "gelir_gider")).toBe(false);
  });
  it("şablon varsa şablonun bölümlerini kullanır", () => {
    const sablon = { bolumler: ["ozet"] } as RaporSablon;
    expect(bolumAktif(sablon, "ozet", "operasyon")).toBe(true);
    expect(bolumAktif(sablon, "gorevler", "operasyon")).toBe(false);
  });
});

describe("bosSablon", () => {
  it("tipe uygun varsayılan bölümlerle başlar", () => {
    const s = bosSablon("risk", "o1", "u1");
    expect(s.tip).toBe("risk");
    expect(s.ofisId).toBe("o1");
    expect(s.bolumler).toContain("risk");
    expect(s.ad).toBe("");
  });
});

describe("RAPOR_BOLUM_LABELS", () => {
  it("her bölümün etiketi var", () => {
    for (const b of TUM_RAPOR_BOLUMLERI) {
      expect(RAPOR_BOLUM_LABELS[b]).toBeTruthy();
    }
  });
});
