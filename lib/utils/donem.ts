/** Rapor dönem aralığı (aylık/yıllık) hesaplama ve tarih-aralık kontrolü. */

export type DonemTipi = "aylik" | "yillik";

export interface DonemAraligi {
  baslangic: string;
  bitis: string;
}

/** Seçilen aylık/yıllık döneme karşılık gelen [başlangıç, bitiş] ISO tarih aralığını hesaplar. */
export function donemAraligiHesapla(
  donemTipi: DonemTipi,
  secilenDonem: string,
  secilenYil: string
): DonemAraligi | null {
  // Date.UTC kullanılır — sunucu/tarayıcı yerel saat dilimine bağlı kaymayı önler
  // (yerel Date() + toISOString() kombinasyonu pozitif UTC ofsetlerinde bir gün kayabiliyordu).
  if (donemTipi === "aylik") {
    const [yearStr, monthStr] = secilenDonem.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) return null;
    const baslangic = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const bitis = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // ayın son günü
    return { baslangic: baslangic.toISOString(), bitis: bitis.toISOString() };
  }
  const year = Number(secilenYil);
  if (!year) return null;
  const baslangic = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const bitis = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { baslangic: baslangic.toISOString(), bitis: bitis.toISOString() };
}

/** Bir tarihin [baslangic, bitis] aralığına düşüp düşmediğini kontrol eder.
 *  Aralık verilmemişse (eski rapor kayıtları) veya tarih parse edilemiyorsa filtrelemez — güvenli varsayılan. */
export function donemIcindeMi(tarih: string | undefined, baslangic?: string, bitis?: string): boolean {
  if (!baslangic || !bitis) return true;
  if (!tarih) return false;
  const t = new Date(tarih).getTime();
  if (Number.isNaN(t)) return true;
  return t >= new Date(baslangic).getTime() && t <= new Date(bitis).getTime();
}
