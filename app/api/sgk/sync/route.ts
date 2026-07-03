/**
 * POST /api/sgk/sync
 *
 * SGK e-Bildirge'den borç ve prim bilgilerini çeker, Firestore tahakkuk
 * koleksiyonuna upsert eder ve bir GibSyncLog kaydı oluşturur.
 *
 * Gereksinimler:
 *   - GIB_SECRET_KEY env var (SGK şifresi aynı anahtarla şifrelenir)
 *   - Ofis dokümanında sgkKullaniciAdi + sgkEncryptedSifre
 *   - Müşteri dokümanında sgkSicilNo
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { gibDecrypt } from "@/lib/integrations/gib/encrypt";
import { requireStaff } from "@/lib/firebase/verifyToken";
import { sgkLogin, fetchSgkBorcListesi, fetchSgkPrimBilgileri, sgkBorcToTahakkuklar } from "@/lib/integrations/sgk/sgk-client";

interface SgkSyncBody {
  ofisId: string;
  musteriId: string;
  musteriAdi: string;
  musteriVkn?: string;
  sgkSicilNo: string;
  /** AES-GCM şifreli SGK şifresi (Ofis dokümanından) */
  encryptedSgkSifre: string;
  sgkKullaniciAdi: string;
}

export async function POST(req: NextRequest) {
  const actor = await requireStaff(req);
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  if (!process.env.GIB_SECRET_KEY) {
    return NextResponse.json(
      { error: "GIB_SECRET_KEY env değişkeni tanımlanmamış" },
      { status: 500 }
    );
  }

  let body: SgkSyncBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const { ofisId, musteriId, musteriAdi, musteriVkn, sgkSicilNo, encryptedSgkSifre, sgkKullaniciAdi } = body;

  if (!sgkSicilNo || !encryptedSgkSifre || !sgkKullaniciAdi) {
    return NextResponse.json(
      { error: "sgkSicilNo, sgkKullaniciAdi ve encryptedSgkSifre gereklidir" },
      { status: 400 }
    );
  }

  let sgkSifre: string;
  try {
    sgkSifre = gibDecrypt(encryptedSgkSifre);
  } catch {
    return NextResponse.json(
      { error: "SGK şifre çözme başarısız. GIB_SECRET_KEY değişmemiş olmalı." },
      { status: 400 }
    );
  }

  const baslama = new Date().toISOString();

  try {
    // SGK e-Bildirge girişi
    const sessionCookie = await sgkLogin({ kullaniciAdi: sgkKullaniciAdi, sifre: sgkSifre });

    // Borç ve prim bilgilerini paralel çek
    const [borclar, primler] = await Promise.all([
      fetchSgkBorcListesi(sessionCookie, sgkSicilNo, musteriVkn),
      fetchSgkPrimBilgileri(sessionCookie, sgkSicilNo),
    ]);

    // Satırları birleştir, tekrarlananları dönem+tutar bazında filtrele
    const tumSatirlar = [...borclar, ...primler];
    const benzersiz = tumSatirlar.filter(
      (s, i, arr) =>
        arr.findIndex((x) => x.donem === s.donem && x.tutar === s.tutar && x.turu === s.turu) === i
    );

    const tahakkuklar = sgkBorcToTahakkuklar(benzersiz, musteriId, musteriAdi);

    // Firestore'a yaz — Firebase olmadan demo modunda sadece sonuç dön
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId && ofisId) {
      for (const t of tahakkuklar) {
        const id = `sgk-${musteriId}-${t.donem}-${t.vergiTuru ?? "SGK"}`;
        const doc = { id, ofisId, ...t };
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tahakkuklar/${id}`;
        await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fields: firestoreFields(doc) }),
        }).catch((e) => console.warn("[SGK Sync] Firestore yazma hatası:", e));
      }

      // Sync log yaz
      const logId = `sgklog-${Date.now()}`;
      const logUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/gibSyncLogs/${logId}`;
      await fetch(logUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: firestoreFields({
            id: logId,
            ofisId,
            syncTipi: "borc",
            durum: "basarili",
            baslamaTarihi: baslama,
            bitisTarihi: new Date().toISOString(),
            islenenKayitSayisi: tahakkuklar.length,
            createdBy: actor.uid,
          }),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      islenenKayitSayisi: tahakkuklar.length,
      baslamaTarihi: baslama,
      bitisTarihi: new Date().toISOString(),
      tahakkuklar,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SGK bağlantı hatası";
    console.error("[SGK Sync]", err);

    // Hata sync log
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId && ofisId) {
      const logId = `sgklog-${Date.now()}`;
      const logUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/gibSyncLogs/${logId}`;
      await fetch(logUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: firestoreFields({
            id: logId,
            ofisId,
            syncTipi: "borc",
            durum: "basarisiz",
            baslamaTarihi: baslama,
            bitisTarihi: new Date().toISOString(),
            islenenKayitSayisi: 0,
            hataMesaji: message,
            createdBy: actor.uid,
          }),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Firestore REST API için alan dönüştürücü */
function firestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string") out[k] = { stringValue: v };
    else if (typeof v === "number") out[k] = { doubleValue: v };
    else if (typeof v === "boolean") out[k] = { booleanValue: v };
    else if (Array.isArray(v)) out[k] = { arrayValue: { values: v.map((i) => ({ stringValue: String(i) })) } };
    else out[k] = { stringValue: JSON.stringify(v) };
  }
  return out;
}
