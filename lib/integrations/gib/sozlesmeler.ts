import "server-only";

/**
 * GİB'den müşterilerin geçerli sözleşmelerini (beyanname + YMM) çeker.
 *
 * Şu an İVD'nin sözleşme API endpoint'i kamuya açık olmadığı için STUB.
 * Gerçek implementasyon: ivd-client.ts'in pattern'ini takip et —
 *   POST /tvd_server/dispatch  body: { cmd: "smmm_sozlesmeleri_listesi", ... }
 * Captcha + cookie session'a bağlı.
 *
 * Çıktı: GibSozlesme[] (oluşturma için, id ve createdAt eksik)
 */

import type { GibSozlesme, SozlesmeTuru } from "@/lib/types";
import { adminUpsert, getAdminDb } from "@/lib/firebase/admin";

export interface SozlesmeRaw {
  sozlesmeNo: string;
  sozlesmeTuru: SozlesmeTuru;
  basTarihi: string;
  bitTarihi?: string;
  aylikUcret?: number;
  kdvOrani?: number;
  durum: "gecerli" | "sonlanmis" | "iptal";
  pdfUrl?: string;
}

interface IvdCreds {
  kullaniciKodu: string;
  sifre: string;
  vknTckn: string;
  captchaDk?: string;
  captchaImageID?: string;
}

/**
 * STUB — Gerçek İVD entegrasyonu için bekliyor.
 * GİB sözleşme listesi endpoint'i kamuya açık değil; manuel CSV import veya
 * captcha + scraping akışı gerekli.
 */
export async function fetchSozlesmeler(
  _creds: IvdCreds,
  _musteriVknTckn: string
): Promise<SozlesmeRaw[]> {
  // STUB — MVP dışı: gerçek İVD sözleşme endpoint'i belirsiz
  return [];
}

/**
 * Sözleşmeden aylık ana ödeme tahakkuğu türetir.
 * Geçerli ve aylık ücreti olan sözleşmeler için, içinde bulunulan ay için
 * bir tahakkuk üretir (idempotent — aynı (musteri, ay, sozlesme) zaten varsa atlar).
 */
export function sozlesmedenTahakkukTuret(
  sozlesme: GibSozlesme,
  donem: string // "YYYY-MM"
): {
  id: string;
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  donem: string;
  tahakkukTuru: "hizmet";
  hizmetTuru: "mali_musavirlik";
  tutar: number;
  kdvOrani: number;
  netTutar: number;
  kdvTutar: number;
  stopajOrani: number;
  stopajTutar: number;
  tahsilEdilecek: number;
  vadeTarihi: string;
  durum: "bekliyor";
  bildirimDurumu: "kapali";
  panelLinki: string;
  aciklama: string;
  kaynak: "sozlesme";
  sozlesmeNo: string;
  otomatikTuretilmis: true;
  createdBy: string;
  createdAt: string;
} | null {
  if (!sozlesme.aylikUcret || sozlesme.aylikUcret <= 0) return null;
  if (sozlesme.durum !== "gecerli") return null;

  const brut = sozlesme.aylikUcret;
  const kdvOran = sozlesme.kdvOrani ?? 20;
  const net = brut / (1 + kdvOran / 100);
  const kdv = brut - net;
  const stopajOran = 20; // SMMM stopaj sabit
  const stopaj = net * (stopajOran / 100);
  const tahsil = brut - stopaj;
  // Vade: ay sonu
  const [yyyy, mm] = donem.split("-").map(Number);
  const sonGun = new Date(yyyy, mm, 0).toISOString().slice(0, 10);

  return {
    id: `tk-soz-${sozlesme.musteriId}-${donem}-${sozlesme.sozlesmeNo}`,
    ofisId: sozlesme.ofisId,
    musteriId: sozlesme.musteriId,
    musteriAdi: sozlesme.musteriAdi,
    donem,
    tahakkukTuru: "hizmet",
    hizmetTuru: "mali_musavirlik",
    tutar: brut,
    kdvOrani: kdvOran,
    netTutar: net,
    kdvTutar: kdv,
    stopajOrani: stopajOran,
    stopajTutar: stopaj,
    tahsilEdilecek: tahsil,
    vadeTarihi: sonGun,
    durum: "bekliyor",
    bildirimDurumu: "kapali",
    panelLinki: `/panel?tahakkuk=tk-soz-${sozlesme.musteriId}-${donem}`,
    aciklama: `Sözleşme ${sozlesme.sozlesmeNo} otomatik aylık tahakkuk (${donem})`,
    kaynak: "sozlesme",
    sozlesmeNo: sozlesme.sozlesmeNo,
    otomatikTuretilmis: true,
    createdBy: "system",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Bir müşteri için sözleşmeleri yaz + aylık otomatik tahakkukları oluştur.
 * Sunucu tarafından (cron veya manuel sync) çağrılır.
 */
export async function sozlesmeleriYazVeTahakkukOlustur(
  sozlesmeler: GibSozlesme[],
  donem: string
): Promise<{ yazilan: number; tahakkukOlusturulan: number }> {
  const db = getAdminDb();
  if (!db) return { yazilan: 0, tahakkukOlusturulan: 0 };

  let yazilan = 0;
  let tahakkukOlusturulan = 0;

  for (const s of sozlesmeler) {
    try {
      await adminUpsert("gibSozlesmeleri", s.id, s as unknown as Record<string, unknown>);
      yazilan += 1;
      const tahakkuk = sozlesmedenTahakkukTuret(s, donem);
      if (tahakkuk) {
        await adminUpsert("tahakkuklar", tahakkuk.id, tahakkuk as unknown as Record<string, unknown>);
        tahakkukOlusturulan += 1;
      }
    } catch (err) {
      console.error("[sozlesmeleriYaz] hata", s.id, err);
    }
  }

  return { yazilan, tahakkukOlusturulan };
}
