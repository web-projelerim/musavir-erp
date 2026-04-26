/**
 * POST /api/gib/sync
 *
 * Şifreli GİB kimlik bilgilerini çözer, IVD'ye bağlanır,
 * tebligat / beyanname / mükellef durumu çeker ve Firestore'a yazar.
 *
 * Body:
 *   ofisId         : string
 *   syncTipi       : "tebligat" | "beyanname" | "mukellef_durum" | "tumu"
 *   ivdKullaniciKodu : string
 *   vknTckn        : string
 *   encryptedIvdSifre? : şifreli parola (gibEncrypt çıktısı)
 *   musteriId?     : belirli müşteri VKN'si (opsiyonel)
 *   musteriVkn?    : belirli müşteri VKN'si (opsiyonel)
 */

import { NextRequest, NextResponse } from "next/server";
import { gibDecrypt } from "@/lib/integrations/gib/encrypt";
import { fetchTebligatlar, fetchBeyannameler, fetchMukellefDurumu } from "@/lib/integrations/gib/ivd-client";

type SyncTipi = "tebligat" | "beyanname" | "mukellef_durum" | "tumu";

interface SyncBody {
  ofisId: string;
  syncTipi: SyncTipi;
  ivdKullaniciKodu: string;
  vknTckn: string;
  encryptedIvdSifre?: string;
  musteriVkn?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GIB_SECRET_KEY) {
      return NextResponse.json(
        { error: "GIB_SECRET_KEY env değişkeni tanımlanmamış" },
        { status: 500 }
      );
    }

    const body: SyncBody = await req.json();
    const { ivdKullaniciKodu, vknTckn, encryptedIvdSifre, syncTipi, musteriVkn } = body;

    if (!ivdKullaniciKodu || !vknTckn) {
      return NextResponse.json(
        { error: "ivdKullaniciKodu ve vknTckn zorunludur" },
        { status: 400 }
      );
    }

    if (!encryptedIvdSifre) {
      return NextResponse.json(
        { error: "Şifreli IVD parolası (encryptedIvdSifre) gereklidir. Önce /api/gib/secrets ile kaydedin." },
        { status: 400 }
      );
    }

    // Sunucu tarafında şifre çözme
    let ivdSifre: string;
    try {
      ivdSifre = gibDecrypt(encryptedIvdSifre);
    } catch {
      return NextResponse.json(
        { error: "Şifre çözme başarısız. GIB_SECRET_KEY değişmemiş olmalı." },
        { status: 400 }
      );
    }

    const creds = { vknTckn, kullaniciKodu: ivdKullaniciKodu, sifre: ivdSifre };
    const baslama = new Date().toISOString();
    const sonuclar: Record<string, unknown> = {};

    if (syncTipi === "tebligat" || syncTipi === "tumu") {
      sonuclar.tebligatlar = await fetchTebligatlar(creds, musteriVkn);
    }
    if (syncTipi === "beyanname" || syncTipi === "tumu") {
      sonuclar.beyannameler = await fetchBeyannameler(creds, musteriVkn);
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
