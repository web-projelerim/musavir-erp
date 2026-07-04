import type { Beyanname } from "@/lib/types";

/**
 * Beyanname takip durumu — son tarih VE beyanname durumu birlikte değerlendirilir.
 *
 * Önemli: Verilmiş/iptal beyanname, son tarihi geçmiş olsa bile "gecikmiş"
 * sayılmaz. Eski mantık yalnızca tarihe bakıyordu ve verilmiş beyannameleri
 * bile kırmızı gösteriyordu; bu yardımcı bunu düzeltir.
 *
 * - "verildi"  → beyanname verilmiş (takip gerektirmez)
 * - "gecikti"  → son tarih geçmiş ve hâlâ bekliyor
 * - "yaklasan" → son tarihe `esikGun` gün veya daha az kaldı, hâlâ bekliyor
 * - "normal"   → bekliyor ama son tarih uzak
 * - "iptal"    → iptal edilmiş
 */
export type BeyannameTakipDurumu = "verildi" | "gecikti" | "yaklasan" | "normal" | "iptal";

export const YAKLASAN_ESIK_GUN = 7;

/** Referans tarihe göre son tarihe kalan tam gün sayısı (negatif = geçmiş). */
export function kalanGun(sonTarih: string, ref: Date = new Date()): number | null {
  const dt = new Date(sonTarih);
  if (isNaN(dt.getTime())) return null;
  // Saat farklarını ele: her iki tarafı da gün başlangıcına indir
  const a = Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const b = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function beyannameTakipDurumu(
  b: Pick<Beyanname, "durum" | "sonTarih">,
  ref: Date = new Date(),
  esikGun: number = YAKLASAN_ESIK_GUN
): BeyannameTakipDurumu {
  if (b.durum === "verildi") return "verildi";
  if (b.durum === "iptal") return "iptal";

  const gun = kalanGun(b.sonTarih, ref);
  if (gun === null) return "normal";
  if (gun < 0) return "gecikti";
  if (gun <= esikGun) return "yaklasan";
  return "normal";
}

export function beyannameGecikti(b: Pick<Beyanname, "durum" | "sonTarih">, ref?: Date): boolean {
  return beyannameTakipDurumu(b, ref) === "gecikti";
}

export function beyannameYaklasan(
  b: Pick<Beyanname, "durum" | "sonTarih">,
  ref?: Date,
  esikGun?: number
): boolean {
  return beyannameTakipDurumu(b, ref, esikGun) === "yaklasan";
}

export interface BeyannameTakipOzeti {
  gecikenSayisi: number;
  yaklasanSayisi: number;
  bekleyenSayisi: number;
  /** Aksiyon gerektirenler (geciken + yaklaşan) — dashboard rozeti için */
  aksiyonGerektiren: number;
}

export function beyannameTakipOzeti(
  liste: Pick<Beyanname, "durum" | "sonTarih">[],
  ref: Date = new Date()
): BeyannameTakipOzeti {
  let gecikenSayisi = 0;
  let yaklasanSayisi = 0;
  let bekleyenSayisi = 0;
  for (const b of liste) {
    const d = beyannameTakipDurumu(b, ref);
    if (d === "gecikti") gecikenSayisi += 1;
    else if (d === "yaklasan") yaklasanSayisi += 1;
    else if (d === "normal") bekleyenSayisi += 1;
  }
  return {
    gecikenSayisi,
    yaklasanSayisi,
    bekleyenSayisi,
    aksiyonGerektiren: gecikenSayisi + yaklasanSayisi,
  };
}
