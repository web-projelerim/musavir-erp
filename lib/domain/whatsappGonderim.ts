/**
 * İstemci tarafı WhatsApp gönderim akışı — tek noktadan karar + gönder/kuyruk.
 *
 * Müşavirin ayarlardaki tür-bazlı "Otomatik / Onay Bekle" tercihine göre
 * (bkz. otomatikGonderimKarari) mesajı ya anında gönderir ya da
 * `gonderimler` koleksiyonuna onay bekleyen kayıt olarak düşürür.
 *
 * Kullanım (modal/sayfa içinden):
 *   await whatsappGonderimYurut({ ayar, tur: "davet", ... });
 *
 * Not: Bu modül istemci sağlayıcısını (provider) kullanır; sunucu cron'ları
 * için lib/integrations/whatsapp/server.ts (whatsappGonder) kullanılır.
 */

import { otomatikGonderimKarari, type GonderimKarari, type MesajTuru } from "@/lib/domain/otomatikGonderim";
import { mesajOlustur } from "@/lib/domain/mesajSablonlari";
import { sendWhatsAppMessages } from "@/lib/integrations/whatsapp/provider";
import { createGonderimKaydi } from "@/lib/firebase/repositories";
import { getOfisId } from "@/lib/domain/office";
import { formatPara } from "@/lib/utils/format";
import type { WhatsAppEntegrasyonAyari } from "@/lib/types";

export interface GonderimYurutGirdi {
  ayar: WhatsAppEntegrasyonAyari | undefined;
  tur: MesajTuru;
  ofisId?: string;
  musteriId: string;
  musteriAdi: string;
  telefon: string;
  mesaj: string;
  /** gonderimler.sablonId — mesaj türü etiketi (ör. "davet", "rapor") */
  sablonId: string;
  /** İlişkili kaydın id'si (ör. rapor.id, davet token'ı) */
  icerikRef?: string;
  /** isFirebaseConfigured — demo modda kayıt/gönderim yapılmaz */
  firebaseAcik: boolean;
}

export interface GonderimYurutSonuc {
  karar: GonderimKarari;
  /** Otomatik gidip başarıyla gönderildiyse true */
  gonderildi: boolean;
  /** WhatsApp env yok — simülasyon modu */
  simulated?: boolean;
  hataMesaji?: string;
}

/**
 * Mesaj türü kararına göre WhatsApp mesajını gönderir veya kuyruğa alır.
 * Asla throw etmez; sonucu obje olarak döner (çağıran toast gösterebilir).
 */
export async function whatsappGonderimYurut(g: GonderimYurutGirdi): Promise<GonderimYurutSonuc> {
  const karar = otomatikGonderimKarari(g.ayar, g.tur);

  // Tür pasif → hiç gönderim/kayıt oluşturma
  if (karar === "pasif") {
    return { karar, gonderildi: false };
  }

  // Demo mod (Firebase yok) → kayıt yazma; sessizce geç
  if (!g.firebaseAcik) {
    return { karar, gonderildi: false };
  }

  const ortak = {
    ofisId: getOfisId(g.ofisId),
    kanal: "whatsapp" as const,
    musteriId: g.musteriId,
    musteriAdi: g.musteriAdi,
    sablonId: g.sablonId,
    icerikRef: g.icerikRef,
    mesaj: g.mesaj,
  };

  if (karar === "otomatik") {
    const sonuclar = await sendWhatsAppMessages([
      { musteriId: g.musteriId, musteriAdi: g.musteriAdi, phone: g.telefon, body: g.mesaj },
    ]).catch(() => []);
    const basarili = sonuclar[0]?.basarili === true;
    const simulated = sonuclar[0]?.simulated === true;

    await createGonderimKaydi({
      ...ortak,
      durum: basarili ? "gonderildi" : "basarisiz",
      sentAt: basarili ? new Date().toISOString() : undefined,
      hataMesaji: basarili ? undefined : sonuclar[0]?.hataMesaji,
    });

    return { karar, gonderildi: basarili, simulated, hataMesaji: basarili ? undefined : sonuclar[0]?.hataMesaji };
  }

  // onay_bekle → kuyruğa "bekliyor"
  await createGonderimKaydi({ ...ortak, durum: "bekliyor" });
  return { karar, gonderildi: false };
}

// ─── Mesaj şablonları (merkezî; müşavir ayarlardan düzenleyebilir) ────────────

export function buildDavetWhatsAppMessage(
  input: { musteriAdi: string; davetLinki: string },
  ayar?: WhatsAppEntegrasyonAyari
): string {
  return mesajOlustur("davet", ayar, { firma_adi: input.musteriAdi, davet_linki: input.davetLinki });
}

export function buildRaporWhatsAppMessage(
  input: { musteriAdi: string; donem: string; raporTuru: string; panelLinki?: string },
  ayar?: WhatsAppEntegrasyonAyari
): string {
  return mesajOlustur("rapor", ayar, {
    firma_adi: input.musteriAdi,
    donem: input.donem,
    rapor_turu: input.raporTuru,
    panel_linki: input.panelLinki,
  });
}

export function buildBeyannameWhatsAppMessage(
  input: { musteriAdi: string; tur: string; donem: string; sonTarih: string },
  ayar?: WhatsAppEntegrasyonAyari
): string {
  return mesajOlustur("beyanname", ayar, {
    firma_adi: input.musteriAdi,
    tur: input.tur,
    donem: input.donem,
    son_tarih: input.sonTarih,
  });
}

export function buildVadeWhatsAppMessage(
  input: { musteriAdi: string; tutar?: number; vadeTarihi?: string },
  ayar?: WhatsAppEntegrasyonAyari
): string {
  return mesajOlustur("vade", ayar, {
    firma_adi: input.musteriAdi,
    tutar: input.tutar !== undefined ? formatPara(input.tutar) : undefined,
    vade_tarihi: input.vadeTarihi,
  });
}

export function buildBelgeWhatsAppMessage(
  input: { musteriAdi: string; donem?: string; aciklama?: string },
  ayar?: WhatsAppEntegrasyonAyari
): string {
  return mesajOlustur("belge", ayar, {
    firma_adi: input.musteriAdi,
    donem: input.donem && input.donem.trim() ? `${input.donem} dönemi` : "ilgili",
    aciklama: input.aciklama,
  });
}
