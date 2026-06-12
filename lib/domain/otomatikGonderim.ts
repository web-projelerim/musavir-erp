/**
 * Otomatik gönderim politikası karar yardımcısı.
 *
 * Müşavir, ayarlar sayfasından her mesaj türü için "Otomatik" veya "Onay Bekle"
 * seçer. Bu modül, sistem bir mesaj göndermek istediğinde hangi yolu izleyeceğine
 * karar verir.
 *
 * Kullanım:
 *   const karar = otomatikGonderimKarari(ayar, "tahakkuk");
 *   if (karar === "otomatik") { ... gönder ... }
 *   else if (karar === "onay_bekle") { ... gonderimler koleksiyonuna durum:bekliyor yaz ... }
 *   else if (karar === "pasif") { ... gönderim yapma ... }
 */

import type { WhatsAppEntegrasyonAyari } from "@/lib/types";

export type MesajTuru =
  | "tahakkuk"
  | "vade"
  | "belge"
  | "davet"
  | "beyanname"
  | "rapor";

export type GonderimKarari = "otomatik" | "onay_bekle" | "pasif";

interface MesajTuruAyari {
  aktif: boolean;
  otomatikGonder: boolean;
}

function turAyari(
  ayar: WhatsAppEntegrasyonAyari | undefined,
  tur: MesajTuru
): MesajTuruAyari {
  if (!ayar) return { aktif: false, otomatikGonder: false };
  switch (tur) {
    case "tahakkuk":
      return {
        aktif: ayar.tahakkukMesajiAktif,
        otomatikGonder: ayar.tahakkukMesajiOtomatikGonder ?? false,
      };
    case "vade":
      return {
        aktif: ayar.vadeHatirlatmaAktif,
        otomatikGonder: ayar.vadeHatirlatmaOtomatikGonder ?? false,
      };
    case "belge":
      return {
        aktif: ayar.belgeEksikAktif,
        otomatikGonder: ayar.belgeEksikOtomatikGonder ?? false,
      };
    case "davet":
      return {
        aktif: ayar.davetMesajiAktif,
        otomatikGonder: ayar.davetMesajiOtomatikGonder ?? false,
      };
    case "beyanname":
      return {
        aktif: ayar.beyannameMesajiAktif ?? true,
        otomatikGonder: ayar.beyannameMesajiOtomatikGonder ?? false,
      };
    case "rapor":
      return {
        aktif: ayar.raporMesajiAktif ?? true,
        otomatikGonder: ayar.raporMesajiOtomatikGonder ?? false,
      };
  }
}

/**
 * Bir mesaj türü için gönderim politikası.
 *
 * - `pasif`: Mesaj türü tamamen kapalı veya global anahtar kapalı → hiç gönderim yok
 * - `otomatik`: Sistem onay almadan gönderir
 * - `onay_bekle`: Mesaj `gonderimler` koleksiyonuna `durum:bekliyor` ile düşer,
 *   müşavir manuel onay verene kadar gitmez
 */
export function otomatikGonderimKarari(
  ayar: WhatsAppEntegrasyonAyari | undefined,
  tur: MesajTuru
): GonderimKarari {
  if (!ayar) return "onay_bekle"; // güvenli varsayılan
  if (ayar.otomatikGonderimGloballeAcik === false) return "onay_bekle";
  const { aktif, otomatikGonder } = turAyari(ayar, tur);
  if (!aktif) return "pasif";
  return otomatikGonder ? "otomatik" : "onay_bekle";
}
