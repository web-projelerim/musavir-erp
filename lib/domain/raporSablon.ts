import type { RaporBolumKey, RaporSablon, RaporTip } from "@/lib/types";

export const RAPOR_BOLUM_LABELS: Record<RaporBolumKey, string> = {
  ozet: "Genel Özet",
  musteri_bilgileri: "Müşteri Bilgileri",
  gorevler: "Görevler",
  beyannameler: "Beyannameler",
  tahsilatlar: "Tahsilatlar",
  tebligatlar: "Tebligatlar",
  risk: "Risk Değerlendirmesi",
};

export const TUM_RAPOR_BOLUMLERI = Object.keys(RAPOR_BOLUM_LABELS) as RaporBolumKey[];

/** Rapor tipine göre mantıklı varsayılan bölüm seti. */
export function varsayilanBolumler(tip: RaporTip): RaporBolumKey[] {
  switch (tip) {
    case "gelir_gider":
      return ["ozet", "musteri_bilgileri", "tahsilatlar"];
    case "vergi_beyan":
      return ["ozet", "musteri_bilgileri", "beyannameler", "tebligatlar"];
    case "operasyon":
      return ["ozet", "musteri_bilgileri", "gorevler", "beyannameler", "tahsilatlar"];
    case "risk":
      return ["ozet", "musteri_bilgileri", "risk", "tebligatlar"];
    default:
      return ["ozet", "musteri_bilgileri"];
  }
}

/** Bir bölüm şablonda etkin mi? Şablon yoksa varsayılan tipe göre karar verilir. */
export function bolumAktif(
  sablon: RaporSablon | null | undefined,
  bolum: RaporBolumKey,
  tip: RaporTip
): boolean {
  const bolumler = sablon?.bolumler ?? varsayilanBolumler(tip);
  return bolumler.includes(bolum);
}

/** Yeni şablon için başlangıç değerleri. */
export function bosSablon(tip: RaporTip, ofisId: string, olusturan: string): Omit<RaporSablon, "id" | "createdAt"> {
  return {
    ofisId,
    ad: "",
    tip,
    bolumler: varsayilanBolumler(tip),
    olusturan,
  };
}
