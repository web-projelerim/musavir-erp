import type { Tahsilat } from "@/lib/types";

/**
 * Bir tahsilat kaydının ödenen tutarı.
 * - durum "odendi" → tamamı ödendi kabul edilir (odenenTutar boş olsa bile)
 * - aksi halde odenenTutar (kısmi ödemelerde) veya 0
 */
export function odenenTutari(t: Tahsilat): number {
  if (t.durum === "odendi") return t.tutar;
  return Math.min(t.odenenTutar ?? 0, t.tutar);
}

/** Kalan bakiye — asla negatif olmaz. */
export function kalanBakiye(t: Tahsilat): number {
  return Math.max(0, t.tutar - odenenTutari(t));
}

export interface MusteriBakiye {
  musteriId: string;
  musteriAdi: string;
  toplamTutar: number;
  odenen: number;
  kalan: number;
  kayitSayisi: number;
  gecikenSayisi: number;
  /** En eski ödenmemiş vade — takip önceliği için */
  enEskiVade?: string;
}

/** Müşteri bazında kalan bakiye özeti; kalanı en yüksek olan başta. */
export function musteriBakiyeOzeti(tahsilatlar: Tahsilat[]): MusteriBakiye[] {
  const map = new Map<string, MusteriBakiye>();
  for (const t of tahsilatlar) {
    const mevcut = map.get(t.musteriId) ?? {
      musteriId: t.musteriId,
      musteriAdi: t.musteriAdi,
      toplamTutar: 0,
      odenen: 0,
      kalan: 0,
      kayitSayisi: 0,
      gecikenSayisi: 0,
      enEskiVade: undefined as string | undefined,
    };
    const odenen = odenenTutari(t);
    const kalan = kalanBakiye(t);
    mevcut.toplamTutar += t.tutar;
    mevcut.odenen += odenen;
    mevcut.kalan += kalan;
    mevcut.kayitSayisi += 1;
    if (t.durum === "gecikti") mevcut.gecikenSayisi += 1;
    if (kalan > 0 && (!mevcut.enEskiVade || t.vadeTarihi < mevcut.enEskiVade)) {
      mevcut.enEskiVade = t.vadeTarihi;
    }
    map.set(t.musteriId, mevcut);
  }
  return Array.from(map.values()).sort((a, b) => b.kalan - a.kalan);
}

export interface GenelBakiyeOzeti {
  toplamAlacak: number;
  tahsilEdilen: number;
  kalanBakiye: number;
  gecikenTutar: number;
  gecikenSayisi: number;
}

/** Tüm ofis için genel özet (metric kartları). */
export function genelBakiyeOzeti(tahsilatlar: Tahsilat[]): GenelBakiyeOzeti {
  let toplamAlacak = 0;
  let tahsilEdilen = 0;
  let gecikenTutar = 0;
  let gecikenSayisi = 0;
  for (const t of tahsilatlar) {
    toplamAlacak += t.tutar;
    tahsilEdilen += odenenTutari(t);
    if (t.durum === "gecikti") {
      gecikenTutar += kalanBakiye(t);
      gecikenSayisi += 1;
    }
  }
  return {
    toplamAlacak,
    tahsilEdilen,
    kalanBakiye: Math.max(0, toplamAlacak - tahsilEdilen),
    gecikenTutar,
    gecikenSayisi,
  };
}

/**
 * Kısmi ödeme sonrası yeni durum/odenenTutar hesabı.
 * Toplam ödeme tutara ulaşırsa "odendi", kısmen ödendiyse "kismi".
 */
export function kismiOdemeUygula(
  t: Tahsilat,
  odemeTutari: number
): Pick<Tahsilat, "odenenTutar" | "durum" | "odemeTarihi"> {
  const yeniOdenen = Math.min(t.tutar, odenenTutari(t) + Math.max(0, odemeTutari));
  const tamamlandi = yeniOdenen >= t.tutar;
  return {
    odenenTutar: yeniOdenen,
    durum: tamamlandi ? "odendi" : "kismi",
    ...(tamamlandi ? { odemeTarihi: new Date().toISOString() } : {}),
  };
}
