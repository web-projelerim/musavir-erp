/**
 * WhatsApp mesaj şablonları — merkezî kaynak.
 *
 * Her mesaj türü için varsayılan bir şablon vardır; müşavir ayarlardan
 * (WhatsAppEntegrasyonAyari.mesajSablonlari) kendi metnini yazabilir.
 * Şablonlar {degisken} yer tutucuları içerir; `sablonUygula` bunları doldurur.
 *
 * Hem istemci akışları (whatsappGonderim.ts) hem sunucu cron'ları (vade job)
 * bu modülü kullanır — mesaj metni tek yerden yönetilir.
 */

import type { MesajTuru } from "@/lib/domain/otomatikGonderim";
import type { WhatsAppEntegrasyonAyari } from "@/lib/types";

/** Her tür için varsayılan şablon metni ({...} yer tutucularıyla). */
export const VARSAYILAN_SABLONLAR: Record<MesajTuru, string> = {
  tahakkuk:
    "Sayın {firma_adi}, {donem} dönemi için panel üzerinden güncel tahakkukunuz tanımlanmıştır. Lütfen kontrol ediniz: {panel_linki}",
  vade:
    "Sayın {firma_adi}, {tutar} tutarındaki tahakkukunuzun son ödeme tarihi {vade_tarihi}. Lütfen ödemenizi zamanında gerçekleştirin.",
  belge:
    "Sayın {firma_adi}, {donem} işlemleriniz için tarafımıza iletmeniz gereken belgeler: {aciklama}. Lütfen en kısa sürede gönderiniz.",
  davet:
    "Sayın {firma_adi}, mali müşaviriniz sizi MusavirERP mükellef paneline davet etti. Hesabınızı oluşturmak için: {davet_linki}",
  beyanname:
    "Sayın {firma_adi}, {tur} beyannameniz ({donem}) için son tarih {son_tarih} yaklaşmaktadır. Gerekli belge ve bilgileri en kısa sürede iletmenizi rica ederiz.",
  rapor:
    "Sayın {firma_adi}, {donem} dönemi {rapor_turu} raporunuz hazırlanmıştır. Panelinizden görüntüleyebilirsiniz.",
};

/** UI'da gösterilecek kullanılabilir değişkenler (yer tutucu adları). */
export const SABLON_DEGISKENLERI: Record<MesajTuru, string[]> = {
  tahakkuk: ["firma_adi", "donem", "tutar", "panel_linki"],
  vade: ["firma_adi", "tutar", "vade_tarihi"],
  belge: ["firma_adi", "donem", "aciklama"],
  davet: ["firma_adi", "davet_linki"],
  beyanname: ["firma_adi", "tur", "donem", "son_tarih"],
  rapor: ["firma_adi", "donem", "rapor_turu", "panel_linki"],
};

export const SABLON_ETIKETLERI: Record<MesajTuru, string> = {
  tahakkuk: "Tahakkuk Bildirimi",
  vade: "Vade Hatırlatma",
  belge: "Eksik Belge Bildirimi",
  davet: "Mükellef Daveti",
  beyanname: "Beyanname Hatırlatma",
  rapor: "Rapor Gönderimi",
};

/** {anahtar} yer tutucularını değerlerle değiştirir. Bilinmeyen anahtar korunur. */
export function sablonUygula(sablon: string, degiskenler: Record<string, string | undefined>): string {
  return sablon.replace(/\{(\w+)\}/g, (_, anahtar: string) => {
    const deger = degiskenler[anahtar];
    return deger !== undefined && deger !== "" ? deger : `{${anahtar}}`;
  });
}

/**
 * Bir mesaj türü için nihai metni üretir: müşavirin özel şablonu varsa onu,
 * yoksa varsayılanı kullanır ve değişkenleri doldurur.
 */
export function mesajOlustur(
  tur: MesajTuru,
  ayar: WhatsAppEntegrasyonAyari | undefined,
  degiskenler: Record<string, string | undefined>
): string {
  const ozel = ayar?.mesajSablonlari?.[tur];
  const sablon = ozel && ozel.trim() ? ozel : VARSAYILAN_SABLONLAR[tur];
  return sablonUygula(sablon, degiskenler);
}
