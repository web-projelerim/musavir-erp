import "server-only";

/**
 * GİB sync iş mantığı.
 * /api/cron/gib-sync (manuel tetikleme) veya instrumentation.ts tarafından çağrılır.
 *
 * ⚠️  GİB IVD artık CAPTCHA gerektiriyor. Otomatik cron tabanlı sync çalışmaz.
 *     Kullanıcı /ayarlar → GİB Sync butonuyla captcha çözüp manuel tetiklemelidir.
 *     Bu fonksiyon captcha bilgisi eksikse erken çıkar (sunucuyu crashlemez).
 *
 * Gerekli env:
 *   FIREBASE_SERVICE_ACCOUNT_KEY  — Firebase Admin erişimi
 *   GIB_SECRET_KEY                — IVD şifre çözme anahtarı
 *   GIB_IVD_KULLANICI_KODU        — Müşavir IVD kullanıcı kodu
 *   GIB_IVD_SIFRE                 — Müşavir IVD şifresi
 */

import { getAdminDb, adminUpsert } from "@/lib/firebase/admin";
import { gibDecrypt } from "@/lib/integrations/gib/encrypt";
import { fetchTebligatlar, fetchBeyannameler, fetchBorcListesi } from "@/lib/integrations/gib/ivd-client";
import { tebligatBildirimleriOlustur } from "@/lib/domain/tebligatBildirim";
import type { GibEntegrasyonAyari, Musteri, Beyanname, Tahakkuk, Tebligat } from "@/lib/types";

export interface GibSyncSonuc {
  ok: boolean;
  baslamaTarihi: string;
  bitisTarihi: string;
  islenenOfis: number;
  sonuclar: OfisSync[];
  mesaj?: string;
}

interface OfisSync {
  ofisId: string;
  islenenMusteri: number;
  tebligatSayisi: number;
  beyannameSayisi: number;
  tahakkukSayisi: number;
  hatalar: string[];
}

function nowIso() {
  return new Date().toISOString();
}

function stableBeyannameId(musteriId: string, tur: string, donem: string) {
  return `bey-gib-${musteriId}-${tur}-${donem}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
}

function stableTebligatId(musteriId: string, tarih: string, baslik: string) {
  return `teb-gib-${musteriId}-${tarih.slice(0, 10)}-${baslik.slice(0, 30)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
}

function stableTahakkukId(musteriId: string, donem: string, vergiTuru: string, discriminator: string) {
  return `tk-gib-${musteriId}-${donem}-${vergiTuru}-${discriminator}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
}

export interface GibSyncOptions {
  /** CAPTCHA çözümü — GİB IVD yeni sistemde zorunlu */
  captchaDk?: string;
  captchaImageID?: string;
}

export async function runGibSync(opts: GibSyncOptions = {}): Promise<GibSyncSonuc> {
  const baslamaTarihi = nowIso();

  // GİB artık CAPTCHA gerektiriyor — captcha yoksa açıklayıcı hata dön
  if (!opts.captchaDk || !opts.captchaImageID) {
    return {
      ok: false,
      baslamaTarihi,
      bitisTarihi: nowIso(),
      islenenOfis: 0,
      sonuclar: [],
      mesaj:
        "GİB IVD sync için captcha gereklidir. " +
        "Ayarlar → GİB Senkronizasyon bölümünden captcha'yı çözüp tekrar deneyin.",
    };
  }

  const db = getAdminDb();
  if (!db) {
    return {
      ok: false,
      baslamaTarihi,
      bitisTarihi: nowIso(),
      islenenOfis: 0,
      sonuclar: [],
      mesaj: "FIREBASE_SERVICE_ACCOUNT_KEY eksik — Firebase Admin başlatılamadı",
    };
  }
  if (!process.env.GIB_SECRET_KEY) {
    return {
      ok: false,
      baslamaTarihi,
      bitisTarihi: nowIso(),
      islenenOfis: 0,
      sonuclar: [],
      mesaj: "GIB_SECRET_KEY env değişkeni eksik",
    };
  }

  // Otomatik sync açık ve şifresi kayıtlı tüm entegrasyonları çek
  const snap = await db.collection("gibEntegrasyonAyarlari").get();
  const aktifAyarlar = snap.docs
    .map((d) => d.data() as GibEntegrasyonAyari)
    .filter(
      (a) =>
        a.encryptedIvdSifre &&
        a.ivdKullaniciKodu &&
        a.vknTckn &&
        (a.otomatikTebligatSync || a.otomatikBeyanSync || a.otomatikBorcSync)
    );

  const sonuclar: OfisSync[] = [];

  // ── ENV VAR FALLBACK ─────────────────────────────────────────────────────────
  // Firestore'da ayarlı ofis yoksa .env.local'daki credentials kullan.
  // Tüm aktif müşterileri bu kimlik bilgileriyle sync eder.
  if (aktifAyarlar.length === 0) {
    const envKodu = process.env.GIB_IVD_KULLANICI_KODU;
    const envSifre = process.env.GIB_IVD_SIFRE;
    const envParola = process.env.GIB_IVD_PAROLA;

    if (!envKodu || !envSifre) {
      return {
        ok: true,
        baslamaTarihi,
        bitisTarihi: nowIso(),
        islenenOfis: 0,
        sonuclar: [],
        mesaj:
          "Otomatik sync açık ofis bulunamadı. " +
          "GIB_IVD_KULLANICI_KODU ve GIB_IVD_SIFRE env değerleri de tanımlı değil.",
      };
    }

    // Tüm aktif müşterileri çek (ofisId filtresi yok — env mod tek kiracılı varsayar)
    const tumMusteriSnap = await db
      .collection("musteriler")
      .where("durum", "==", "aktif")
      .get();
    const tumMusteriler = tumMusteriSnap.docs.map((d) => d.data() as Musteri);

    if (tumMusteriler.length === 0) {
      return {
        ok: true,
        baslamaTarihi,
        bitisTarihi: nowIso(),
        islenenOfis: 0,
        sonuclar: [],
        mesaj: "Aktif müşteri bulunamadı — beyanname sync yapılmadı",
      };
    }

    // İlk müşterinin ofisId'sini referans al (log ve upsert için)
    const envOfisId = tumMusteriler[0].ofisId ?? "env-default";
    const envCreds = {
      vknTckn: tumMusteriler[0].vknTckn,
      kullaniciKodu: envKodu,
      sifre: envSifre,
      captchaDk: opts.captchaDk,
      captchaImageID: opts.captchaImageID,
    };

    const hatalar: string[] = [];
    let tebligatSayisi = 0, beyannameSayisi = 0, tahakkukSayisi = 0;

    for (const musteri of tumMusteriler) {
      try {
        const creds = { ...envCreds, vknTckn: musteri.vknTckn };
        const yazmaGorevleri: Promise<void>[] = [];

        // Tebligat
        const tebligatlar = await fetchTebligatlar(creds, musteri.vknTckn);
        for (const t of tebligatlar) {
          const enriched = { ...t, ofisId: musteri.ofisId ?? envOfisId, musteriId: musteri.id || t.musteriId, musteriAdi: t.musteriAdi || musteri.firmaAdi };
          const id = stableTebligatId(enriched.musteriId, enriched.tarih, enriched.baslik);
          yazmaGorevleri.push(adminUpsert("tebligatlar", id, { id, ...enriched }));
          // Bildirim + WhatsApp gönderim kuyruğu (karşıt inceleme → kritik)
          yazmaGorevleri.push(
            tebligatBildirimleriOlustur({ id, ...enriched } as Tebligat, musteri).catch((e) =>
              console.error("[gib-sync] tebligatBildirim hatası:", e)
            )
          );
        }
        tebligatSayisi += tebligatlar.length;

        // Beyanname
        const beyannameler = await fetchBeyannameler(creds, musteri.vknTckn);
        for (const b of beyannameler) {
          const enriched = { ...b, ofisId: musteri.ofisId ?? envOfisId, musteriId: musteri.id || b.musteriId, musteriAdi: b.musteriAdi || musteri.firmaAdi };
          const id = stableBeyannameId(enriched.musteriId, enriched.tur, enriched.donem);
          yazmaGorevleri.push(adminUpsert("beyannameler", id, { id, ...enriched }));
        }
        beyannameSayisi += beyannameler.length;

        // Borç/Tahakkuk
        const borclar = await fetchBorcListesi(creds, musteri.vknTckn);
        for (const b of borclar) {
          const enriched = { ...b, ofisId: musteri.ofisId ?? envOfisId, musteriId: musteri.id || b.musteriId, musteriAdi: b.musteriAdi || musteri.firmaAdi };
          const discriminator = enriched.resmiTahakkukFisNo ?? enriched.vadeTarihi;
          const id = stableTahakkukId(enriched.musteriId, enriched.donem, enriched.vergiTuru ?? "diger", discriminator);
          yazmaGorevleri.push(adminUpsert("tahakkuklar", id, { id, ...enriched }));
        }
        tahakkukSayisi += borclar.length;

        await Promise.all(yazmaGorevleri);
      } catch (err) {
        const msg = `${musteri.firmaAdi} (${musteri.vknTckn}): ${err instanceof Error ? err.message : "bilinmeyen hata"}`;
        hatalar.push(msg);
        console.error("[GİB Sync][env]", msg);
      }
    }

    await yazSyncLog(db, envOfisId, hatalar.length === 0 ? "basarili" : "basarisiz", baslamaTarihi, tebligatSayisi + beyannameSayisi + tahakkukSayisi, hatalar[0]);
    sonuclar.push({ ofisId: envOfisId, islenenMusteri: tumMusteriler.length, tebligatSayisi, beyannameSayisi, tahakkukSayisi, hatalar });

    return { ok: true, baslamaTarihi, bitisTarihi: nowIso(), islenenOfis: 1, sonuclar };
  }
  // ─────────────────────────────────────────────────────────────────────────────

  for (const ayar of aktifAyarlar) {
    const ofisId = ayar.ofisId;
    const ofisBaslama = nowIso();

    // IVD şifresini çöz
    let ivdSifre: string;
    try {
      ivdSifre = gibDecrypt(ayar.encryptedIvdSifre!);
    } catch {
      const hata = "IVD şifre çözme başarısız — GIB_SECRET_KEY değişmiş olabilir";
      await yazSyncLog(db, ofisId, "basarisiz", ofisBaslama, 0, hata);
      sonuclar.push({ ofisId, islenenMusteri: 0, tebligatSayisi: 0, beyannameSayisi: 0, tahakkukSayisi: 0, hatalar: [hata] });
      continue;
    }

    const creds = {
      vknTckn: ayar.vknTckn!,
      kullaniciKodu: ayar.ivdKullaniciKodu!,
      sifre: ivdSifre,
      captchaDk: opts.captchaDk!,
      captchaImageID: opts.captchaImageID!,
    };

    // Ofisteki aktif müşterileri çek
    const musteriSnap = await db
      .collection("musteriler")
      .where("ofisId", "==", ofisId)
      .where("durum", "==", "aktif")
      .get();

    const musteriler = musteriSnap.docs.map((d) => d.data() as Musteri);
    const hedefler =
      musteriler.length > 0
        ? musteriler
        : [{ id: "", firmaAdi: ayar.vknTckn!, vknTckn: ayar.vknTckn! } as Musteri];

    const hatalar: string[] = [];
    let tebligatSayisi = 0;
    let beyannameSayisi = 0;
    let tahakkukSayisi = 0;

    for (const musteri of hedefler) {
      try {
        const yazmaGorevleri: Promise<void>[] = [];

        if (ayar.otomatikTebligatSync) {
          const tebligatlar = await fetchTebligatlar(creds, musteri.vknTckn);
          for (const t of tebligatlar) {
            const enriched: Omit<Tebligat, "id"> & { ofisId: string } = {
              ...t,
              ofisId,
              musteriId: musteri.id || t.musteriId,
              musteriAdi: t.musteriAdi || musteri.firmaAdi,
            };
            const id = stableTebligatId(enriched.musteriId, enriched.tarih, enriched.baslik);
            yazmaGorevleri.push(adminUpsert("tebligatlar", id, { id, ...enriched }));
            // Bildirim + WhatsApp gönderim kuyruğu (karşıt inceleme → kritik)
            yazmaGorevleri.push(
              tebligatBildirimleriOlustur({ id, ...enriched } as Tebligat, musteri).catch((e) =>
                console.error("[gib-sync] tebligatBildirim hatası:", e)
              )
            );
          }
          tebligatSayisi += tebligatlar.length;
        }

        if (ayar.otomatikBeyanSync) {
          const beyannameler = await fetchBeyannameler(creds, musteri.vknTckn);
          for (const b of beyannameler) {
            const enriched: Omit<Beyanname, "id"> & { ofisId: string } = {
              ...b,
              ofisId,
              musteriId: musteri.id || b.musteriId,
              musteriAdi: b.musteriAdi || musteri.firmaAdi,
            };
            const id = stableBeyannameId(enriched.musteriId, enriched.tur, enriched.donem);
            yazmaGorevleri.push(adminUpsert("beyannameler", id, { id, ...enriched }));
          }
          beyannameSayisi += beyannameler.length;
        }

        if (ayar.otomatikBorcSync) {
          const borclar = await fetchBorcListesi(creds, musteri.vknTckn);
          for (const b of borclar) {
            const enriched: Omit<Tahakkuk, "id"> & { ofisId: string } = {
              ...b,
              ofisId,
              musteriId: musteri.id || b.musteriId,
              musteriAdi: b.musteriAdi || musteri.firmaAdi,
            };
            const discriminator = enriched.resmiTahakkukFisNo ?? enriched.vadeTarihi;
            const id = stableTahakkukId(enriched.musteriId, enriched.donem, enriched.vergiTuru ?? "diger", discriminator);
            yazmaGorevleri.push(adminUpsert("tahakkuklar", id, { id, ...enriched }));
          }
          tahakkukSayisi += borclar.length;
        }

        await Promise.all(yazmaGorevleri);
      } catch (err) {
        const msg = `${musteri.firmaAdi} (${musteri.vknTckn}): ${err instanceof Error ? err.message : "bilinmeyen hata"}`;
        hatalar.push(msg);
        console.error("[GİB Sync]", msg);
      }
    }

    const toplam = tebligatSayisi + beyannameSayisi + tahakkukSayisi;
    const syncDurum = hatalar.length === 0 ? "basarili" : "basarisiz";

    await yazSyncLog(db, ofisId, syncDurum, ofisBaslama, toplam, hatalar[0]);
    await adminUpsert("gibEntegrasyonAyarlari", ayar.id, {
      sonBasariliSync: syncDurum === "basarili" ? nowIso() : ayar.sonBasariliSync,
      sonHata: syncDurum === "basarisiz" ? hatalar[0] : undefined,
      durum: syncDurum === "basarili" ? "bagli" : "hata",
      updatedAt: nowIso(),
      updatedBy: "cron",
    });

    sonuclar.push({ ofisId, islenenMusteri: hedefler.length, tebligatSayisi, beyannameSayisi, tahakkukSayisi, hatalar });
  }

  return {
    ok: true,
    baslamaTarihi,
    bitisTarihi: nowIso(),
    islenenOfis: sonuclar.length,
    sonuclar,
  };
}

async function yazSyncLog(
  db: FirebaseFirestore.Firestore,
  ofisId: string,
  durum: "basarili" | "basarisiz",
  baslamaTarihi: string,
  islenenKayitSayisi: number,
  hataMesaji?: string
) {
  const id = `gib-cron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await adminUpsert("gibSyncLogs", id, {
    id,
    ofisId,
    syncTipi: "tebligat",
    durum,
    baslamaTarihi,
    bitisTarihi: nowIso(),
    islenenKayitSayisi,
    hataMesaji,
    createdBy: "cron",
  });
}
