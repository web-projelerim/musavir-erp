/**
 * POST /api/gib/bulk-sync
 *
 * Captcha bir kere çözülür → tek bir IVD oturumu açılır → tüm aktif müşteriler
 * için beyanname/tahakkuk verileri bu oturum token'ı ile çekilir.
 * Böylece her müşteri için ayrı captcha gerekmez.
 *
 * Yanıt: { ok, islenenMusteriSayisi, toplamKayit, hataSayisi, hatalar[] }
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

interface BulkSyncBody {
  ofisId: string;
  captchaDk: string;
  captchaImageID: string;
  syncTipi: "beyanname" | "tahakkuk" | "tumu";
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

  if (!ofisId || !captchaDk || !captchaImageID) {
    return NextResponse.json(
      { error: "ofisId, captchaDk ve captchaImageID zorunludur" },
      { status: 400 }
    );
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

  // ── 1. Aktif müşterileri Firestore'dan çek ───────────────────────────────
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

  // ── 2. IVD'ye BİR KERE giriş yap — token tüm müşterilerde paylaşılır ────
  let token: string;
  try {
    token = await ivdLogin({
      vknTckn: kullaniciKodu, // ofis hesabı
      kullaniciKodu,
      sifre,
      captchaDk,
      captchaImageID,
    });
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : "IVD giriş başarısız";
    return NextResponse.json({ error: mesaj }, { status: 502 });
  }

  const envCreds = { vknTckn: kullaniciKodu, kullaniciKodu, sifre, captchaDk, captchaImageID };

  const hatalar: string[] = [];
  let toplamKayit = 0;

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
      hatalar.push(`${firmaAdi}: ${mesaj}`);
      console.warn(`[GİB Bulk Sync] ${firmaAdi} (${vkn}):`, mesaj);
    }
  }

  return NextResponse.json({
    ok: hatalar.length < musteriler.length,
    islenenMusteriSayisi: musteriler.length,
    toplamKayit,
    hataSayisi: hatalar.length,
    hatalar: hatalar.slice(0, 10), // ilk 10 hatayı döndür
  });
}
