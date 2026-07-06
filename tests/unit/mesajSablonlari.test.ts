import { describe, expect, it } from "vitest";
import { sablonUygula, mesajOlustur, VARSAYILAN_SABLONLAR } from "@/lib/domain/mesajSablonlari";
import type { WhatsAppEntegrasyonAyari } from "@/lib/types";

describe("sablonUygula", () => {
  it("yer tutucuları değerlerle doldurur", () => {
    const out = sablonUygula("Sayın {firma_adi}, tutar {tutar}", { firma_adi: "ABC Ltd", tutar: "1.000 TL" });
    expect(out).toBe("Sayın ABC Ltd, tutar 1.000 TL");
  });

  it("değeri olmayan/boş yer tutucuyu korur", () => {
    const out = sablonUygula("{firma_adi} - {eksik}", { firma_adi: "ABC", eksik: "" });
    expect(out).toBe("ABC - {eksik}");
  });
});

describe("mesajOlustur", () => {
  it("özel şablon yoksa varsayılanı kullanır", () => {
    const out = mesajOlustur("davet", undefined, { firma_adi: "ABC", davet_linki: "http://x" });
    expect(out).toContain("ABC");
    expect(out).toContain("http://x");
    expect(VARSAYILAN_SABLONLAR.davet).toContain("{davet_linki}");
  });

  it("müşavirin özel şablonunu kullanır", () => {
    const ayar = { mesajSablonlari: { davet: "Merhaba {firma_adi}, link: {davet_linki}" } } as unknown as WhatsAppEntegrasyonAyari;
    const out = mesajOlustur("davet", ayar, { firma_adi: "XYZ", davet_linki: "http://y" });
    expect(out).toBe("Merhaba XYZ, link: http://y");
  });

  it("boş özel şablonu yok sayıp varsayılana döner", () => {
    const ayar = { mesajSablonlari: { davet: "   " } } as unknown as WhatsAppEntegrasyonAyari;
    const out = mesajOlustur("davet", ayar, { firma_adi: "XYZ", davet_linki: "http://y" });
    expect(out).toContain("mükellef paneline davet");
  });
});
