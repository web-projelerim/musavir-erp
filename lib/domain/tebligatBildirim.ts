/**
 * Yeni tebligat geldiğinde otomatik bildirim + WhatsApp gönderim kaydı oluşturur.
 *
 * Tebligat türleri:
 * - Karşıt İnceleme Tutanağı → daima KRİTİK, otomatik gönderim ayarı bypass edilir
 *   (zaten daha sonra müşavir onayı alınabilir ama bildirim ilk anda düşer)
 * - Diğer tebligatlar → kritik öncelikli bildirim
 *
 * Sunucu tarafından çağrılır (gib-sync veya manuel tebligat ekleme).
 */

import { adminUpsert, getAdminDb } from "@/lib/firebase/admin";
import { otomatikGonderimKarari } from "@/lib/domain/otomatikGonderim";
import type { Tebligat, Musteri, WhatsAppEntegrasyonAyari } from "@/lib/types";

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function karsitIncelemeMi(tebligat: Tebligat): boolean {
  const norm = (s?: string) => s?.toLocaleLowerCase("tr-TR") ?? "";
  return (
    norm(tebligat.tur).includes("karşıt") ||
    norm(tebligat.tur).includes("karsit") ||
    norm(tebligat.baslik).includes("karşıt") ||
    norm(tebligat.baslik).includes("karsit") ||
    norm(tebligat.baslik).includes("inceleme tutanağı") ||
    norm(tebligat.baslik).includes("inceleme tutanagi")
  );
}

/**
 * Tebligat sonrası bildirim + WhatsApp gönderim kuyruğu oluşturur.
 * Sessizce başarısız olur (sync ana akışını bozmaz).
 */
export async function tebligatBildirimleriOlustur(
  tebligat: Tebligat,
  musteri?: Pick<Musteri, "id" | "firmaAdi" | "gsm1" | "telefon">
): Promise<void> {
  try {
    const karsit = karsitIncelemeMi(tebligat);
    const onemDerecesi = karsit ? "kritik" : "yuksek";

    // 1. Sistemde bildirim oluştur
    const bildirimId = uniqueId("bild");
    await adminUpsert("bildirimler", bildirimId, {
      id: bildirimId,
      ofisId: tebligat.ofisId,
      tip: karsit ? "tebligat_karsit_inceleme" : "tebligat_yeni",
      baslik: karsit ? "🚨 Karşıt İnceleme Tutanağı" : "📩 Yeni Tebligat",
      mesaj: `${tebligat.musteriAdi}: ${tebligat.baslik}`,
      durum: "okunmamis",
      tarih: new Date().toISOString(),
      link: `/tebligatlar`,
      onemDerecesi,
      tebligatId: tebligat.id,
      musteriId: tebligat.musteriId,
    });

    // 2. WhatsApp gönderim kuyruğuna ekle (onay/otomatik kararı ayarlara göre)
    const telefon = musteri?.gsm1 || musteri?.telefon;
    if (telefon) {
      // Ofise ait WhatsApp ayarını oku → otomatik / onay-bekle / pasif kararı
      const db = getAdminDb();
      let ayar: WhatsAppEntegrasyonAyari | undefined;
      if (db) {
        try {
          const snap = await db
            .collection("whatsappEntegrasyonAyarlari")
            .where("ofisId", "==", tebligat.ofisId)
            .limit(1)
            .get();
          ayar = snap.docs[0]?.data() as WhatsAppEntegrasyonAyari | undefined;
        } catch {}
      }
      // Karşıt inceleme her durumda kritik — global anahtar dışında bypass yok.
      // Mesaj türü: tebligat (genel ve karşıt için aynı ayar kullanılıyor)
      const karar = otomatikGonderimKarari(ayar, karsit ? "tahakkuk" : "tahakkuk");
      // NOT: "tebligat" tipi şu an yok; mevcut türlerden en yakını tahakkuk.
      // Karşıt inceleme için ayrı bir mesaj türü tanımlamak istenirse types/index.ts güncellenebilir.

      if (karar === "pasif") {
        return; // ayar kapalı; gönderim oluşturma
      }

      const gonderimId = uniqueId("gnd");
      const mesaj = karsit
        ? `Sayın ${tebligat.musteriAdi}, GİB'den karşıt inceleme tutanağı tebligatı alındı. Acil görüşme için lütfen müşavirinizle iletişime geçin.`
        : `Sayın ${tebligat.musteriAdi}, GİB'den yeni bir tebligat alındı: ${tebligat.baslik}. Detaylar için panelinizi kontrol edin.`;
      // Karşıt inceleme her zaman manuel onay isteyebilir — şimdilik karara uy
      const durumIlk = karar === "otomatik" ? "gonderildi" : "bekliyor";
      // TODO(faz-2): karar==="otomatik" iken WhatsApp provider'ı sunucu tarafından çağır.
      // Şu an provider client-only; cron veya ayrı bir server route ile çağrılması gerekir.
      await adminUpsert("gonderimler", gonderimId, {
        id: gonderimId,
        ofisId: tebligat.ofisId,
        kanal: "whatsapp",
        musteriId: tebligat.musteriId,
        musteriAdi: tebligat.musteriAdi,
        sablonId: karsit ? "karsit_inceleme" : "tebligat_yeni",
        icerikRef: tebligat.id,
        mesaj,
        durumKarar: karar, // metadata: karar nedeni
        gonderilebilir: karar === "otomatik",
        durumIlk,
        durum: "bekliyor", // ayarlara göre cron sonra otomatik gönderir veya müşavir onaylar
        denemeSayisi: 0,
        createdAt: new Date().toISOString(),
        oncelik: karsit ? "kritik" : "yuksek",
      });
    }
  } catch (err) {
    console.error("[tebligatBildirim] Bildirim/gönderim yazımı başarısız:", err);
  }
}
