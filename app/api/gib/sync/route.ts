/**
 * POST /api/gib/sync
 *
 * İki kimlik doğrulama yolu:
 *   - beyanname / tahakkuk / mukellef_durum:
 *       GIB_IVD_KULLANICI_KODU + GIB_IVD_SIFRE env değişkenleri (ofis seviyesi)
 *   - tebligat:
 *       Her müşterinin kendi ivdKullaniciKodu + encryptedIvdSifre kimlik bilgileri
 */

import { NextRequest, NextResponse } from "next/server";
import { gibDecrypt } from "@/lib/integrations/gib/encrypt";
import { requireAuth } from "@/lib/firebase/verifyToken";
import {
  fetchTebligatlar,
  fetchBeyannameler,
  fetchBorcListesi,
  fetchMukellefDurumu,
} from "@/lib/integrations/gib/ivd-client";

type SyncTipi = "tebligat" | "beyanname" | "tahakkuk" | "mukellef_durum" | "tumu";

interface SyncBody {
  ofisId: string;
  syncTipi: SyncTipi;
  musteriVkn: string;
  /** GİB captcha çözümü — yeni sistemde zorunlu */
  captchaDk: string;
  captchaImageID: string;
  /** Yalnızca tebligat sync için — mükellefin kendi IVD bilgileri */
  ivdKullaniciKodu?: string;
  vknTckn?: string;
  encryptedIvdSifre?: string;
}

/** beyanname/tahakkuk/mukellef_durum env kimlik bilgilerini okur */
function getEnvCreds() {
  const kullaniciKodu = process.env.GIB_IVD_KULLANICI_KODU;
  const sifre = process.env.GIB_IVD_SIFRE;
  return { kullaniciKodu, sifre };
}

export async function POST(req: NextRequest) {
  const actor = await requireAuth(req);
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  if (!process.env.GIB_SECRET_KEY) {
    return NextResponse.json(
      { error: "GIB_SECRET_KEY env değişkeni tanımlanmamış" },
      { status: 500 }
    );
  }

  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  // ofisId doğrulaması
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

  const { syncTipi, musteriVkn } = body;

  if (!musteriVkn) {
    return NextResponse.json({ error: "musteriVkn zorunludur" }, { status: 400 });
  }

  try {
    const baslama = new Date().toISOString();
    const sonuclar: Record<string, unknown> = {};

    // ── Tebligat: mükellefin kendi kimlik bilgileri ──────────────────────────
    if (syncTipi === "tebligat" || syncTipi === "tumu") {
      const { ivdKullaniciKodu, vknTckn, encryptedIvdSifre } = body;

      if (!ivdKullaniciKodu || !vknTckn || !encryptedIvdSifre) {
        if (syncTipi === "tebligat") {
          return NextResponse.json(
            {
              error:
                "Tebligat sync için ivdKullaniciKodu, vknTckn ve encryptedIvdSifre gereklidir. " +
                "Müşteri GİB kimlik bilgilerini kaydedin.",
            },
            { status: 400 }
          );
        }
        // tumu modunda tebligat kimlik bilgisi yoksa tebligatı atla
      } else {
        let ivdSifre: string;
        try {
          ivdSifre = gibDecrypt(encryptedIvdSifre);
        } catch {
          return NextResponse.json(
            { error: "Tebligat şifre çözme başarısız. GIB_SECRET_KEY değişmemiş olmalı." },
            { status: 400 }
          );
        }

        const tebCreds = { vknTckn, kullaniciKodu: ivdKullaniciKodu, sifre: ivdSifre, captchaDk: body.captchaDk, captchaImageID: body.captchaImageID };
        sonuclar.tebligatlar = await fetchTebligatlar(tebCreds, musteriVkn);
      }
    }

    // ── Beyanname / Tahakkuk: env kimlik bilgileri ────────────────────────────
    if (
      syncTipi === "beyanname" ||
      syncTipi === "tahakkuk" ||
      syncTipi === "mukellef_durum" ||
      syncTipi === "tumu"
    ) {
      const { kullaniciKodu: envKullanici, sifre: envSifre } = getEnvCreds();

      if (!envKullanici || !envSifre) {
        return NextResponse.json(
          {
            error:
              "GIB_IVD_KULLANICI_KODU veya GIB_IVD_SIFRE env değişkeni tanımlanmamış. " +
              ".env.local dosyasına ekleyin.",
          },
          { status: 500 }
        );
      }

      const envCreds = {
        vknTckn: musteriVkn,
        kullaniciKodu: envKullanici,
        sifre: envSifre,
        captchaDk: body.captchaDk,
        captchaImageID: body.captchaImageID,
      };

      if (syncTipi === "beyanname" || syncTipi === "tumu") {
        sonuclar.beyannameler = await fetchBeyannameler(envCreds, musteriVkn);
      }
      if (syncTipi === "tahakkuk" || syncTipi === "tumu") {
        sonuclar.tahakkuklar = await fetchBorcListesi(envCreds, musteriVkn);
      }
      if (syncTipi === "mukellef_durum") {
        sonuclar.mukellefDurumu = await fetchMukellefDurumu(envCreds, musteriVkn);
      }
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
