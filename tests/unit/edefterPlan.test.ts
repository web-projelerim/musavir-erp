import { describe, it, expect } from "vitest";
import { edefterBeratPlani, tarihTR } from "@/lib/domain/edefterPlan";
import { getVergiTakvimi } from "@/lib/data/vergiTakvimi";

/**
 * e-Defter berat planı — 12 ayın tamamı sabitlenir.
 * Asıl amaç: hatırlatmanın SON TARİH ayında çıkması (çeyreğin kapandığı ayda değil).
 */

describe("edefterBeratPlani — aylık berat", () => {
  it("her ay, 3 ay önceki dönemin beratını bu ay sonuna işaretler", () => {
    // [ay (0-tabanlı), beklenen dönem]
    const beklenen: [number, string, string][] = [
      [0, "2025-10", "Ekim 2025"],   // Ocak → Ekim (önceki yıl)
      [1, "2025-11", "Kasım 2025"],
      [2, "2025-12", "Aralık 2025"],
      [3, "2026-01", "Ocak 2026"],   // Nisan → Ocak
      [4, "2026-02", "Şubat 2026"],
      [5, "2026-03", "Mart 2026"],
      [6, "2026-04", "Nisan 2026"],  // Temmuz → Nisan
      [7, "2026-05", "Mayıs 2026"],
      [8, "2026-06", "Haziran 2026"],
      [9, "2026-07", "Temmuz 2026"], // Ekim → Temmuz
      [10, "2026-08", "Ağustos 2026"],
      [11, "2026-09", "Eylül 2026"],
    ];

    for (const [ay, donem, donemAdi] of beklenen) {
      const plan = edefterBeratPlani(new Date(2026, ay, 26));
      expect(plan.aylik.donem, `ay=${ay}`).toBe(donem);
      expect(plan.aylik.donemAdi, `ay=${ay}`).toBe(donemAdi);
    }
  });

  it("yıl sınırını doğru geçer — Ocak'ta dönem önceki yıla düşer", () => {
    const plan = edefterBeratPlani(new Date(2026, 0, 26));
    expect(plan.aylik.donem).toBe("2025-10");
  });
});

describe("edefterBeratPlani — 3 aylık berat", () => {
  it("yalnızca berat aylarında (Oca/Nis/Tem/Eki) uyarı üretir", () => {
    const beratAylari = [0, 3, 6, 9];
    for (let ay = 0; ay < 12; ay++) {
      const plan = edefterBeratPlani(new Date(2026, ay, 26));
      if (beratAylari.includes(ay)) {
        expect(plan.ucAylik, `ay=${ay} berat ayı — uyarı bekleniyor`).not.toBeNull();
      } else {
        expect(plan.ucAylik, `ay=${ay} berat ayı değil — uyarı olmamalı`).toBeNull();
      }
    }
  });

  it("çeyreğin KAPANDIĞI aylarda (Mar/Haz/Eyl/Ara) uyarı üretmez — eski hatanın regresyonu", () => {
    for (const ay of [2, 5, 8, 11]) {
      expect(edefterBeratPlani(new Date(2026, ay, 26)).ucAylik, `ay=${ay}`).toBeNull();
    }
  });

  it("berat ayını doğru çeyreğe eşler", () => {
    expect(edefterBeratPlani(new Date(2026, 6, 26)).ucAylik).toMatchObject({
      ceyrek: 1,
      ceyrekAdi: "1. Çeyrek (Oca–Mar) 2026",
    });
    expect(edefterBeratPlani(new Date(2026, 9, 26)).ucAylik).toMatchObject({
      ceyrek: 2,
      ceyrekAdi: "2. Çeyrek (Nis–Haz) 2026",
    });
    // Ocak/Nisan → önceki yılın çeyreği
    expect(edefterBeratPlani(new Date(2026, 0, 26)).ucAylik).toMatchObject({
      ceyrek: 3,
      ceyrekAdi: "3. Çeyrek (Tem–Eyl) 2025",
    });
    expect(edefterBeratPlani(new Date(2026, 3, 26)).ucAylik).toMatchObject({
      ceyrek: 4,
      ceyrekAdi: "4. Çeyrek (Eki–Ara) 2025",
    });
  });
});

describe("edefterBeratPlani — vergiTakvimi ile tutarlılık", () => {
  it("üretilen son tarihler takvimdeki e-Defter berat olaylarıyla birebir örtüşür", () => {
    // Takvimin kendi ürettiği berat tarihleri — tek kaynak burası olmalı
    const takvimTarihleri = new Set(
      [...getVergiTakvimi(2025), ...getVergiTakvimi(2026)]
        .filter((o) => o.kategori === "edefter")
        .map((o) => o.tarih)
    );

    for (let ay = 0; ay < 12; ay++) {
      const plan = edefterBeratPlani(new Date(2026, ay, 26));
      expect(
        takvimTarihleri.has(plan.aylik.sonTarih),
        `ay=${ay} son tarih ${plan.aylik.sonTarih} takvimde yok`
      ).toBe(true);
    }
  });
});

describe("tarihTR", () => {
  it("YYYY-MM-DD → DD.MM.YYYY", () => {
    expect(tarihTR("2026-07-31")).toBe("31.07.2026");
  });
});
