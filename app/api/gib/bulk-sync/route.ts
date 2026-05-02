/**
 * POST /api/gib/bulk-sync
 *
 * Akıllı token cache sistemi:
 *  - captchaDk/captchaImageID olmadan çağrılırsa → cache'lenmiş token denenir
 *  - Cache yoksa/süre dolduysa → { needsCaptcha: true } döner
 *  - captchaDk/captchaImageID ile çağrılırsa → yeni login, token cache'lenir (45 dk)
 *
 * Böylece oturum geçerliyken captcha olmadan sync yapılabilir.
 *
 * Yanıt: { ok, islenenMusteriSayisi, toplamKayit, hataSayisi, hatalar[] }
 *      | { needsCaptcha: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/verifyToken";
import { getAdminDb, adminUpsert } from "@/lib/firebase/admin";
import {
  ivdLogin,
  fetchBeyannameler,
  fetchBorcListesi,
} from "@/lib/integrations/gib/ivd-client";
import type { BeyannameType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Token cache TTL: 45 dakika */
const TOKEN_TTL_MS = 45 * 60 * 1000;

interface BulkSyncBody {
  ofisId: string;
  captchaDk?: string;
  captchaImageID?: string;
  syncTipi: "beyanname" | "tahakkuk" | "tumu";
}

/** Cache'lenmiş GİB token'ı Firestore'dan oku */
async function getCachedToken(ofisId: string): Promise<string | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const doc = await db.collection("gibSessions").doc(ofisId).get();
    if (!doc.exists) return null;
    const data = doc.data() as { token?: string; expiresAt?: number } | undefined;
    if (!data?.token || !data?.expiresAt) return null;
    if (Date.now() > data.expiresAt) return null; // süresi dolmuş
    return data.token;
  } catch {
    return null;
  }
}

/** Token'ı Firestore'a yaz (45 dk TTL) */
async function cacheToken(ofisId: string, token: string): Promise<void> {
  try {
    await adminUpsert("gibSessions", ofisId, {
      token,
      expiresAt: Date.now() + TOKEN_TTL_MS,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // cache yazma hatası kritik değil — devam et
  }
}

/** Token'ı geçersiz kıl (captcha hatası gibi durumlarda) */
async function invalidateToken(ofisId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection("gibSessions").doc(ofisId).delete();
  } catch {
    // önemsiz
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireAuth(req);
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  let body: BulkSyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const { ofisId, captchaDk, captchaImageID, syncTipi } = body;

  if (!ofisId) {
    return NextResponse.json({ error: "ofisId zorunludur" }, { status: 400 });
  }

  // Env kimlik bilgileri
  const kullaniciKodu = process.env.GIB_IVD_KULLANICI_KODU;
  const sifre = process.env.GIB_IVD_SIFRE;
  if (!kullaniciKodu || !sifre) {
    return NextResponse.json(
      { error: "GIB_IVD_KULLANICI_KODU veya GIB_IVD_SIFRE env değişkeni eksik" },
      { status: 500 }
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin yapılandırması eksik (FIREBASE_SERVICE_ACCOUNT_KEY)" },
      { status: 500 }
    );
  }

  // ── 1. Token belirle: cache'den al veya yeni login yap ──────────────────
  let token: string;
  const hasCaptcha = !!captchaDk && !!captchaImageID;

  if (!hasCaptcha) {
    // Captcha verilmemiş → cache'i dene
    const cached = await getCachedToken(ofisId);
    if (!cached) {
      // Geçerli oturum yok — istemciden captcha iste
      return NextResponse.json({ needsCaptcha: true }, { status: 200 });
    }
    token = cached;
  } else {
    // Captcha verilmiş → yeni login
    const envCreds = { vknTckn: kullaniciKodu, kullaniciKodu, sifre, captchaDk, captchaImageID };
    try {
      token = await ivdLogin(envCreds);
      // Başarılı login → token'ı cache'le
      await cacheToken(ofisId, token);
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : "IVD giriş başarısız";
      return NextResponse.json({ error: mesaj }, { status: 502 });
    }
  }

  const envCreds = {
    vknTckn: kullaniciKodu,
    kullaniciKodu,
    sifre,
    captchaDk: captchaDk ?? "",
    captchaImageID: captchaImageID ?? "",
  };

  // ── 2. Aktif müşterileri Firestore'dan çek ───────────────────────────────
  const musteriSnap = await db
    .collection("musteriler")
    .where("ofisId", "==", ofisId)
    .where("durum", "==", "aktif")
    .get();

  const musteriler = musteriSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as { id: string; vknTckn?: string; firmaAdi?: string }))
    .filter((m) => m.vknTckn);

  if (musteriler.length === 0) {
    return NextResponse.json({
      ok: true,
      mesaj: "Aktif ve VKN'li müşteri bulunamadı",
      islenenMusteriSayisi: 0,
      toplamKayit: 0,
      hataSayisi: 0,
    });
  }

  const hatalar: string[] = [];
  let toplamKayit = 0;
  let tokenGecersiz = false;

  // ── 3. Her müşteri için token ile veri çek, Firestore'a yaz ─────────────
  for (const musteri of musteriler) {
    const vkn = musteri.vknTckn!;
    const firmaAdi = musteri.firmaAdi ?? vkn;

    try {
      // Beyanname
      if (syncTipi === "beyanname" || syncTipi === "tumu") {
        const rows = await fetchBeyannameler(envCreds, vkn, token);
        for (const row of rows) {
          const stableId = `bey-gib-${musteri.id}-${row.tur}-${row.donem}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-");
          await adminUpsert("beyannameler", stableId, {
            id: stableId,
            ofisId,
            musteriId: musteri.id,
            musteriAdi: firmaAdi,
            tur: row.tur as BeyannameType,
            donem: row.donem,
            sonTarih: row.sonTarih,
            durum: row.durum,
            yasamDongusuDurum: row.yasamDongusuDurum,
            sorumlu: row.sorumlu ?? "",
            kaynakSistem: "gib",
          });
          toplamKayit++;
        }
      }

      // Tahakkuk (borç listesi)
      if (syncTipi === "tahakkuk" || syncTipi === "tumu") {
        const borclar = await fetchBorcListesi(envCreds, vkn, token);
        for (const borc of borclar) {
          const stableId = `tah-gib-${musteri.id}-${borc.vergiTuru ?? "diger"}-${borc.donem}`
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-");
          await adminUpsert("tahakkuklar", stableId, {
            ...borc,
            id: stableId,
            ofisId,
            musteriId: musteri.id,
            musteriAdi: firmaAdi,
          });
          toplamKayit++;
        }
      }
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : "Bilinmeyen hata";

      // Token geçersiz mi? (GİB oturumu sona ermiş olabilir)
      if (
        mesaj.toLowerCase().includes("token") ||
        mesaj.toLowerCase().includes("oturum") ||
        mesaj.toLowerCase().includes("401") ||
        mesaj.toLowerCase().includes("unauthorized")
      ) {
        tokenGecersiz = true;
      }

      hatalar.push(`${firmaAdi}: ${mesaj}`);
      console.warn(`[GİB Bulk Sync] ${firmaAdi} (${vkn}):`, mesaj);
    }
  }

  // Token geçersizse cache'i temizle — bir sonraki istekte captcha istenecek
  if (tokenGecersiz) {
    await invalidateToken(ofisId);
  }

  return NextResponse.json({
    ok: hatalar.length < musteriler.length,
    islenenMusteriSayisi: musteriler.length,
    toplamKayit,
    hataSayisi: hatalar.length,
    hatalar: hatalar.slice(0, 10),
    tokenYenilendi: hasCaptcha, // istemci bilgilendirilsin
  });
}
