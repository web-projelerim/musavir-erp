import "server-only";

/**
 * Vade hatırlatma iş mantığı.
 * /api/cron/vade-hatirlatma (node-cron / harici tetikleme) tarafından çağrılır.
 *
 * Vade tarihi yaklaşan (varsayılan 3 gün içinde) veya gecikmiş, henüz ödenmemiş
 * tahakkukları bulur; ofisin WhatsApp ayarına göre otomatik gönderir veya
 * `gonderimler` koleksiyonuna onay-bekleyen kayıt olarak düşer.
 *
 * Gerekli env:
 *   FIREBASE_SERVICE_ACCOUNT_KEY   — Firestore Admin erişimi
 * Opsiyonel env:
 *   WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID — gerçek gönderim (yoksa kuyruğa yazılır)
 *   VADE_HATIRLATMA_GUN            — kaç gün önceden hatırlatılsın (varsayılan 3)
 */

import { getAdminDb, adminUpsert } from "@/lib/firebase/admin";
import { otomatikGonderimKarari } from "@/lib/domain/otomatikGonderim";
import { mesajOlustur } from "@/lib/domain/mesajSablonlari";
import { whatsappGonder } from "@/lib/integrations/whatsapp/server";
import type { Tahakkuk, Musteri, WhatsAppEntegrasyonAyari } from "@/lib/types";

export interface VadeHatirlatmaSonuc {
  ok: boolean;
  incelenenTahakkuk: number;
  yaklasanTahakkuk: number;
  gonderilen: number;
  kuyruga: number;
  atlanan: number;
  basarisiz: number;
  simulated?: boolean;
  mesaj?: string;
}

// Ödenmemiş sayılan tahakkuk durumları (Firestore "in" — max 10 değer)
const ACIK_DURUMLAR: Tahakkuk["durum"][] = ["bekliyor", "kismi", "gecikti"];

function nowIso() {
  return new Date().toISOString();
}

function formatTL(tutar: number): string {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar);
  } catch {
    return `${tutar} TL`;
  }
}

function formatTarih(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("tr-TR");
}

export async function runVadeHatirlatma(): Promise<VadeHatirlatmaSonuc> {
  const bos: VadeHatirlatmaSonuc = {
    ok: true,
    incelenenTahakkuk: 0,
    yaklasanTahakkuk: 0,
    gonderilen: 0,
    kuyruga: 0,
    atlanan: 0,
    basarisiz: 0,
  };

  const db = getAdminDb();
  if (!db) {
    return { ...bos, ok: false, mesaj: "FIREBASE_SERVICE_ACCOUNT_KEY eksik — Firebase Admin başlatılamadı" };
  }

  const gun = Number(process.env.VADE_HATIRLATMA_GUN ?? "3");
  const esik = new Date();
  esik.setDate(esik.getDate() + (Number.isFinite(gun) ? gun : 3));
  esik.setHours(23, 59, 59, 999);
  const esikIso = esik.toISOString();
  const bugunYmd = new Date().toISOString().slice(0, 10);

  // Açık tahakkukları çek, vadeTarihi'ni bellekte filtrele (composite index gerekmez)
  const snap = await db.collection("tahakkuklar").where("durum", "in", ACIK_DURUMLAR).get();
  const tumu = snap.docs.map((d) => d.data() as Tahakkuk);

  const yaklasanlar = tumu.filter((t) => {
    if (!t.vadeTarihi) return false;
    if (t.vadeTarihi > esikIso) return false; // henüz vade penceresine girmemiş
    const kalan = t.tutar - (t.odenenTutar ?? 0);
    return kalan > 0;
  });

  const sonuc: VadeHatirlatmaSonuc = { ...bos, incelenenTahakkuk: tumu.length, yaklasanTahakkuk: yaklasanlar.length };
  let simulatedGoruldu = false;

  // Ofis WhatsApp ayarı ve müşteri dokümanları için basit önbellek
  const ayarCache = new Map<string, WhatsAppEntegrasyonAyari | undefined>();
  const musteriCache = new Map<string, Musteri | undefined>();

  const ayarGetir = async (ofisId: string): Promise<WhatsAppEntegrasyonAyari | undefined> => {
    if (ayarCache.has(ofisId)) return ayarCache.get(ofisId);
    let ayar: WhatsAppEntegrasyonAyari | undefined;
    try {
      const s = await db.collection("whatsappEntegrasyonAyarlari").where("ofisId", "==", ofisId).limit(1).get();
      ayar = s.docs[0]?.data() as WhatsAppEntegrasyonAyari | undefined;
    } catch {
      /* ayar okunamazsa güvenli varsayılan (onay_bekle) kullanılır */
    }
    ayarCache.set(ofisId, ayar);
    return ayar;
  };

  const musteriGetir = async (musteriId: string): Promise<Musteri | undefined> => {
    if (musteriCache.has(musteriId)) return musteriCache.get(musteriId);
    let musteri: Musteri | undefined;
    try {
      const doc = await db.collection("musteriler").doc(musteriId).get();
      musteri = doc.exists ? (doc.data() as Musteri) : undefined;
    } catch {
      /* yoksa telefon çözülemez, atlanır */
    }
    musteriCache.set(musteriId, musteri);
    return musteri;
  };

  for (const t of yaklasanlar) {
    try {
      const ayar = t.ofisId ? await ayarGetir(t.ofisId) : undefined;
      const karar = otomatikGonderimKarari(ayar, "vade");
      if (karar === "pasif") {
        sonuc.atlanan++;
        continue;
      }

      const musteri = await musteriGetir(t.musteriId);
      const telefon = musteri?.gsm1 || musteri?.telefon;
      if (!telefon) {
        sonuc.atlanan++;
        continue;
      }

      // Günde bir kez: aynı tahakkuk + gün için idempotent kayıt
      const gonderimId = `vade-${t.id}-${bugunYmd}`;
      const mevcut = await db.collection("gonderimler").doc(gonderimId).get();
      if (mevcut.exists && (mevcut.data() as { durum?: string })?.durum === "gonderildi") {
        sonuc.atlanan++;
        continue;
      }

      const kalan = t.tutar - (t.odenenTutar ?? 0);
      const mesaj = mesajOlustur("vade", ayar, {
        firma_adi: t.musteriAdi,
        tutar: formatTL(kalan),
        vade_tarihi: formatTarih(t.vadeTarihi),
      });

      let durum: "gonderildi" | "bekliyor" | "basarisiz" = "bekliyor";
      let hataMesaji: string | undefined;
      let sentAt: string | undefined;

      if (karar === "otomatik") {
        const gonderim = await whatsappGonder({ phone: telefon, body: mesaj });
        if (gonderim.ok) {
          durum = "gonderildi";
          sentAt = nowIso();
          sonuc.gonderilen++;
        } else if (gonderim.simulated) {
          // WhatsApp env yok — kuyrukta bekletilir, müşavir sonra gönderir
          durum = "bekliyor";
          simulatedGoruldu = true;
          sonuc.kuyruga++;
        } else {
          durum = "basarisiz";
          hataMesaji = gonderim.hataMesaji;
          sonuc.basarisiz++;
        }
      } else {
        // onay_bekle
        durum = "bekliyor";
        sonuc.kuyruga++;
      }

      await adminUpsert("gonderimler", gonderimId, {
        id: gonderimId,
        ofisId: t.ofisId,
        kanal: "whatsapp",
        musteriId: t.musteriId,
        musteriAdi: t.musteriAdi,
        sablonId: "vade_hatirlatma",
        icerikRef: t.id,
        mesaj,
        durum,
        hataMesaji,
        sentAt,
        denemeSayisi: durum === "basarisiz" ? 1 : 0,
        createdAt: nowIso(),
      });
    } catch (err) {
      sonuc.basarisiz++;
      console.error("[Vade Hatırlatma]", t.id, err instanceof Error ? err.message : err);
    }
  }

  if (simulatedGoruldu) sonuc.simulated = true;
  return sonuc;
}
