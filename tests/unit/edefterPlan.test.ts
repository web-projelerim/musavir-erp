import { describe, it, expect } from "vitest";
import {
  edefterBeratPlani,
  edefterDonemSonTarihi,
  tarihTR,
  ucAylikDonemMi,
} from "@/lib/domain/edefterPlan";
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

describe("edefterDonemSonTarihi — ileri yön (dönem → son tarih)", () => {
  // NOT: ayinSonGunu hafta sonuna denk gelen son tarihi izleyen Pazartesi'ye kaydırır
  // (iş günü kuralı) — bu yüzden son tarih bir sonraki aya taşabilir.
  it("aylık: dönemi izleyen 3. ayın son günü", () => {
    expect(edefterDonemSonTarihi(2026, 0, "aylik")).toBe("2026-04-30"); // Ocak → Nisan sonu
    expect(edefterDonemSonTarihi(2026, 3, "aylik")).toBe("2026-07-31"); // Nisan → Temmuz sonu
    // Ekim → Ocak 2027 sonu; 31.01.2027 Pazar olduğu için 01.02.2027'ye kayar
    expect(edefterDonemSonTarihi(2026, 9, "aylik")).toBe("2027-02-01");
  });

  it("3 aylık: yalnızca çeyrek sonu dönemleri sorumlu", () => {
    for (let ay = 0; ay < 12; ay++) {
      const beklenen = [2, 5, 8, 11].includes(ay);
      expect(ucAylikDonemMi(ay), `ay=${ay}`).toBe(beklenen);
      expect(edefterDonemSonTarihi(2026, ay, "3aylik") !== "", `ay=${ay}`).toBe(beklenen);
    }
  });

  it("3 aylık çeyrekleri doğru berat ayına götürür", () => {
    expect(edefterDonemSonTarihi(2026, 2, "3aylik")).toBe("2026-07-31");  // Q1 → Temmuz sonu
    // Q2 → Ekim 2026 sonu; 31.10.2026 Cumartesi olduğu için 02.11.2026'ya kayar
    expect(edefterDonemSonTarihi(2026, 5, "3aylik")).toBe("2026-11-02");
    expect(edefterDonemSonTarihi(2026, 8, "3aylik")).toBe("2027-02-01");  // Q3 → Ocak sonu (Pazar → 01.02)
    expect(edefterDonemSonTarihi(2026, 11, "3aylik")).toBe("2027-04-30"); // Q4 → Nisan sonu (izleyen yıl)
  });

  it("ileri ve ters yön birbiriyle tutarlı — plan ayının dönemi aynı son tarihe döner", () => {
    for (let ay = 0; ay < 12; ay++) {
      const plan = edefterBeratPlani(new Date(2026, ay, 26));
      const [dy, da] = plan.aylik.donem.split("-").map(Number);
      expect(edefterDonemSonTarihi(dy, da - 1, "aylik"), `ay=${ay}`).toBe(plan.aylik.sonTarih);
    }
  });

  it("ürettiği son tarihler takvimdeki e-Defter olaylarıyla örtüşür", () => {
    const takvim = new Set(
      [...getVergiTakvimi(2026), ...getVergiTakvimi(2027)]
        .filter((o) => o.kategori === "edefter")
        .map((o) => o.tarih)
    );
    for (let ay = 0; ay < 12; ay++) {
      expect(takvim.has(edefterDonemSonTarihi(2026, ay, "aylik")), `aylık ay=${ay}`).toBe(true);
      if (ucAylikDonemMi(ay)) {
        expect(takvim.has(edefterDonemSonTarihi(2026, ay, "3aylik")), `3aylık ay=${ay}`).toBe(true);
      }
    }
  });
});

describe("tarihTR", () => {
  it("YYYY-MM-DD → DD.MM.YYYY", () => {
    expect(tarihTR("2026-07-31")).toBe("31.07.2026");
  });
});
