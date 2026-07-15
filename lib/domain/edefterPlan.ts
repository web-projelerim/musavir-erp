/**
 * e-Defter berat son tarih planı — saf tarih mantığı (Firestore/IO yok).
 *
 * Kural kaynağı: lib/data/vergiTakvimi.ts. Buradaki eşleme oradaki berat
 * olaylarının TERSİDİR — takvim "hangi dönem hangi tarihte", bu modül ise
 * "bu ay hangi dönemin beratı doluyor" sorusunu yanıtlar:
 *
 *   • Aylık berat : ilgili dönemi izleyen 3. ayın son günü (Ocak dönemi → Nisan sonu)
 *   • 3 aylık berat: Q1 → Temmuz sonu · Q2 → Ekim sonu
 *                    Q3 → Ocak sonu (izleyen yıl) · Q4 → Nisan sonu (izleyen yıl)
 *
 * Takvim değişirse vergiTakvimi.ts ile birlikte burası da güncellenmeli;
 * tests/unit/edefterPlan.test.ts 12 ayın tamamını sabitler.
 */

import { AY_ADI, ayinSonGunu } from "@/lib/data/vergiTakvimi";

export interface EDefterAylikPlan {
  /** Beratı bu ay dolan dönem — "2026-04" */
  donem: string;
  /** İnsan okunur dönem — "Nisan 2026" */
  donemAdi: string;
  /** Son tarih — "2026-07-31" */
  sonTarih: string;
}

export interface EDefterUcAylikPlan {
  ceyrek: 1 | 2 | 3 | 4;
  /** "1. Çeyrek (Oca–Mar) 2026" */
  ceyrekAdi: string;
  sonTarih: string;
}

export interface EDefterBeratPlani {
  /** Aylık yükümlüler için — her ay dolu (her ayın sonunda bir berat doluyor) */
  aylik: EDefterAylikPlan;
  /** 3 aylık yükümlüler için — yalnızca berat aylarında (Oca/Nis/Tem/Eki) dolu */
  ucAylik: EDefterUcAylikPlan | null;
}

const CEYREK_ADI = [
  "1. Çeyrek (Oca–Mar)",
  "2. Çeyrek (Nis–Haz)",
  "3. Çeyrek (Tem–Eyl)",
  "4. Çeyrek (Eki–Ara)",
] as const;

/** Berat ayı (0-tabanlı) → o ayın sonunda son tarihi dolan çeyrek */
const BERAT_AYI_CEYREK: Record<number, { ceyrek: 1 | 2 | 3 | 4; yilOffset: number }> = {
  6: { ceyrek: 1, yilOffset: 0 },  // Temmuz sonu → Q1 (aynı yıl)
  9: { ceyrek: 2, yilOffset: 0 },  // Ekim sonu   → Q2 (aynı yıl)
  0: { ceyrek: 3, yilOffset: -1 }, // Ocak sonu   → Q3 (önceki yıl)
  3: { ceyrek: 4, yilOffset: -1 }, // Nisan sonu  → Q4 (önceki yıl)
};

/** "2026-07-31" → "31.07.2026" */
export function tarihTR(ymd: string): string {
  const [y, a, g] = ymd.split("-");
  return `${g}.${a}.${y}`;
}

/** 3 aylık periyotta dönem ayı (0-tabanlı çeyrek sonu) → berat ayı */
const CEYREK_SONU_BERAT: Record<number, { ay: number; yilOffset: number }> = {
  2: { ay: 6, yilOffset: 0 },  // Mart (Q1)   → Temmuz sonu
  5: { ay: 9, yilOffset: 0 },  // Haziran (Q2)→ Ekim sonu
  8: { ay: 0, yilOffset: 1 },  // Eylül (Q3)  → Ocak sonu (izleyen yıl)
  11: { ay: 3, yilOffset: 1 }, // Aralık (Q4) → Nisan sonu (izleyen yıl)
};

/** 3 aylık yükümlü bu dönemden sorumlu mu? (yalnızca çeyreğin kapandığı aylar) */
export function ucAylikDonemMi(donemAy: number): boolean {
  return donemAy in CEYREK_SONU_BERAT;
}

/**
 * Bir dönemin berat son tarihi — edefterBeratPlani'nin ileri yönlü karşılığı,
 * vergiTakvimi.ts ile aynı kural. Dönem 3 aylık periyotta çeyrek sonu değilse "".
 */
export function edefterDonemSonTarihi(
  yil: number,
  donemAy: number,
  periyot: "aylik" | "3aylik"
): string {
  if (periyot === "aylik") {
    // İlgili dönemi izleyen 3. ayın son günü
    return ayinSonGunu(donemAy >= 9 ? yil + 1 : yil, (donemAy + 3) % 12);
  }
  const c = CEYREK_SONU_BERAT[donemAy];
  return c ? ayinSonGunu(yil + c.yilOffset, c.ay) : "";
}

/**
 * Verilen güne göre, bu ayın sonunda son tarihi dolan e-Defter beratlarını döner.
 * Hatırlatma cron'u ayın 26'sında çalışır → çıktı "bu ay sonuna kadar" demektir.
 */
export function edefterBeratPlani(bugun: Date): EDefterBeratPlani {
  const ay = bugun.getMonth(); // 0-11
  const yil = bugun.getFullYear();
  const sonTarih = ayinSonGunu(yil, ay);

  // Aylık: bu ay sonunda beratı dolan dönem = 3 ay öncesi
  const donemAy = (ay + 9) % 12; // (ay - 3 + 12) % 12
  const donemYil = ay < 3 ? yil - 1 : yil;

  const aylik: EDefterAylikPlan = {
    donem: `${donemYil}-${String(donemAy + 1).padStart(2, "0")}`,
    donemAdi: `${AY_ADI[donemAy]} ${donemYil}`,
    sonTarih,
  };

  const c = BERAT_AYI_CEYREK[ay];
  const ucAylik: EDefterUcAylikPlan | null = c
    ? { ceyrek: c.ceyrek, ceyrekAdi: `${CEYREK_ADI[c.ceyrek - 1]} ${yil + c.yilOffset}`, sonTarih }
    : null;

  return { aylik, ucAylik };
}
