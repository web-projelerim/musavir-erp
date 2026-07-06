/**
 * Yeni tebligat geldiğinde otomatik bildirim + WhatsApp gönderimi oluşturur.
 *
 * Tebligat türleri:
 * - Karşıt İnceleme Tutanağı → daima KRİTİK
 * - Diğer tebligatlar → yüksek öncelikli
 *
 * Bu bildirim türü için WhatsApp gönderimi bilerek onay-bekle/otomatik ayrımını
 * VE global "acil durdurma" anahtarını (otomatikGonderimGloballeAcik) bypass eder —
 * tebligat yanıt süreleri kısa ve yasal olduğundan mesaj her zaman gönderilir.
 *
 * Sunucu tarafından çağrılır (gib-sync veya bulk-sync route).
 */

import { adminUpsert } from "@/lib/firebase/admin";
import { whatsappGonder } from "@/lib/integrations/whatsapp/server";
import { karsitIncelemeMi } from "@/lib/domain/tebligatSla";
import type { Tebligat, Musteri, GonderimKaydi, Bildirim } from "@/lib/types";

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Tebligat sonrası bildirim + WhatsApp gönderimi oluşturur.
 * Sessizce başarısız olur (sync ana akışını bozmaz).
 */
export async function tebligatBildirimleriOlustur(
  tebligat: Tebligat,
  musteri?: Pick<Musteri, "id" | "firmaAdi" | "gsm1" | "telefon">
): Promise<void> {
  try {
    const karsit = karsitIncelemeMi(tebligat);
    const onemDerecesi: Bildirim["onemDerecesi"] = karsit ? "kritik" : "yuksek";

    // 1. Sistemde bildirim oluştur
    const bildirimId = uniqueId("bild");
    const bildirim: Bildirim = {
      id: bildirimId,
      ofisId: tebligat.ofisId,
      tip: "tebligat",
      baslik: karsit ? "🚨 Karşıt İnceleme Tutanağı" : "📩 Yeni Tebligat",
      mesaj: `${tebligat.musteriAdi}: ${tebligat.baslik}`,
      durum: "okunmamis",
      tarih: new Date().toISOString(),
      link: `/tebligatlar`,
      onemDerecesi,
      tebligatId: tebligat.id,
      musteriId: tebligat.musteriId,
    };
    await adminUpsert("bildirimler", bildirimId, { ...bildirim });

    // 2. WhatsApp gönderimi — her zaman, onay-bekle/otomatik ayrımı ve global
    // kill-switch bilerek bypass edilir (kullanıcı onayı).
    const telefon = musteri?.gsm1 || musteri?.telefon;
    if (!telefon) return;

    const mesaj = karsit
      ? `Sayın ${tebligat.musteriAdi}, GİB'den karşıt inceleme tutanağı tebligatı alındı. Acil görüşme için lütfen müşavirinizle iletişime geçin.`
      : `Sayın ${tebligat.musteriAdi}, GİB'den yeni bir tebligat alındı: ${tebligat.baslik}. Detaylar için panelinizi kontrol edin.`;

    const sonuc = await whatsappGonder({ phone: telefon, body: mesaj });
    const gonderimId = uniqueId("gnd");
    const kayit: GonderimKaydi = {
      id: gonderimId,
      ofisId: tebligat.ofisId,
      kanal: "whatsapp",
      musteriId: tebligat.musteriId,
      musteriAdi: tebligat.musteriAdi,
      sablonId: karsit ? "karsit_inceleme" : "tebligat_yeni",
      icerikRef: tebligat.id,
      mesaj,
      durum: sonuc.ok ? "gonderildi" : sonuc.simulated ? "bekliyor" : "basarisiz",
      hataMesaji: sonuc.ok ? undefined : sonuc.hataMesaji,
      denemeSayisi: sonuc.ok || sonuc.simulated ? 0 : 1,
      createdAt: new Date().toISOString(),
      sentAt: sonuc.ok ? new Date().toISOString() : undefined,
    };
    await adminUpsert("gonderimler", gonderimId, { ...kayit });
  } catch (err) {
    console.error("[tebligatBildirim] Bildirim/gönderim yazımı başarısız:", err);
  }
}
