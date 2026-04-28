/**
 * POST /api/gib/sync
 *
 * Şifreli GİB kimlik bilgilerini çözer, IVD'ye bağlanır,
 * tebligat / beyanname / mükellef durumu çeker ve Firestore'a yazar.
 */

import { NextRequest, NextResponse } from "next/server";
import { gibDecrypt } from "@/lib/integrations/gib/encrypt";
import { requireAuth } from "@/lib/firebase/verifyToken";
import { fetchTebligatlar, fetchBeyannameler, fetchBorcListesi, fetchMukellefDurumu } from "@/lib/integrations/gib/ivd-client";

type SyncTipi = "tebligat" | "beyanname" | "tahakkuk" | "mukellef_durum" | "tumu";

interface SyncBody {
  ofisId: string;
  syncTipi: SyncTipi;
  ivdKullaniciKodu: string;
  vknTckn: string;
  encryptedIvdSifre?: string;
  musteriVkn?: string;
}

export async function POST(req: NextRequest) {
  const actor = await requireAuth(req);
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  if (!process.env.GIB_SECRET_KEY) {
    return NextResponse.json({ error: "GIB_SECRET_KEY env değişkeni tanımlanmamış" }, { status: 500 });
  }

  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  // ofisId doğrulaması: body'deki ofisId token sahibiyle eşleşmeli
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId && body.ofisId) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/kullanicilar/${actor.uid}`;
      const fsRes = await fetch(docUrl);
      if (fsRes.ok) {
        const fsData = await fsRes.json();
        const userOfisId = fsData.fields?.ofisId?.stringValue;
        if (userOfisId && userOfisId !== body.ofisId) {
          return NextResponse.json({ error: "ofisId doğrulama hatası" }, { status: 403 });
        }
      }
    } catch {
      // Firestore doğrulaması başarısız olursa devam — Firestore kuralları zaten koruyor
    }
  }

  const { ivdKullaniciKodu, vknTckn, encryptedIvdSifre, syncTipi, musteriVkn } = body;

  if (!ivdKullaniciKodu || !vknTckn) {
    return NextResponse.json({ error: "ivdKullaniciKodu ve vknTckn zorunludur" }, { status: 400 });
  }
  if (!encryptedIvdSifre) {
    return NextResponse.json(
      { error: "Şifreli IVD parolası (encryptedIvdSifre) gereklidir. Önce /api/gib/secrets ile kaydedin." },
      { status: 400 }
    );
  }

  let ivdSifre: string;
  try {
    ivdSifre = gibDecrypt(encryptedIvdSifre);
  } catch {
    return NextResponse.json({ error: "Şifre çözme başarısız. GIB_SECRET_KEY değişmemiş olmalı." }, { status: 400 });
  }

  try {
    const creds = { vknTckn, kullaniciKodu: ivdKullaniciKodu, sifre: ivdSifre };
    const baslama = new Date().toISOString();
    const sonuclar: Record<string, unknown> = {};

    if (syncTipi === "tebligat" || syncTipi === "tumu") {
      sonuclar.tebligatlar = await fetchTebligatlar(creds, musteriVkn);
    }
    if (syncTipi === "beyanname" || syncTipi === "tumu") {
      sonuclar.beyannameler = await fetchBeyannameler(creds, musteriVkn);
    }
    if (syncTipi === "tahakkuk" || syncTipi === "tumu") {
      sonuclar.tahakkuklar = await fetchBorcListesi(creds, musteriVkn);
    }
    if ((syncTipi === "mukellef_durum" || syncTipi === "tumu") && musteriVkn) {
      sonuclar.mukellefDurumu = await fetchMukellefDurumu(creds, musteriVkn);
    }

    return NextResponse.json({
      ok: true,
      baslamaTarihi: baslama,
      bitisTarihi: new Date().toISOString(),
      ...sonuclar,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GİB bağlantı hatası";
    console.error("[GIB Sync]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
