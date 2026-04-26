/**
 * GET /api/cron/gib-sync
 *
 * Vercel Cron Job — her sabah 08:00'de otomatik çalışır (vercel.json).
 * Tüm ofislerin aktif GİB entegrasyonlarını çeker, her müşteri için
 * /api/gib/sync çağrısı yapar ve sonuçları gibSyncLogs'a yazar.
 *
 * Güvenlik: CRON_SECRET env değişkeni ile doğrulama yapılır.
 * Vercel, iç cron çağrılarında otomatik Authorization: Bearer <secret> gönderir.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 dakika (Vercel Pro gerektirir)

export async function GET(req: NextRequest) {
  // Vercel Cron güvenlik doğrulaması
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  try {
    // Firebase Admin SDK gerektirmeden çalışmak için bu cron sadece
    // diğer API route'larına iç istek yapar.
    // Gerçek implementasyon için firebase-admin paketi ile Firestore'u
    // doğrudan sunucu tarafında okumak gerekir — bu stub bir yapıdır.
    // TODO(faz-2): firebase-admin eklenince Firestore'dan ofis listesini çek,
    // her ofis için aktif GİB ayarlarını al, her müşteri için /api/gib/sync çağır.

    console.info("[Cron GİB Sync] Başladı", new Date().toISOString());

    // Örnek iç çağrı yapısı — firebase-admin olmadan tam implementasyon mümkün değil.
    // Şimdilik endpoint'i sağlıklı döndürüyoruz; loglama Firestore'a yazılabilir.
    const sonuc = {
      ok: true,
      mesaj: "GİB cron çalıştı — firebase-admin entegrasyonu tamamlandığında aktif olacak",
      zaman: new Date().toISOString(),
      // gerçek implementasyonda: islenenOfis, toplamMusteri, basarili, basarisiz
    };

    console.info("[Cron GİB Sync] Tamamlandı", sonuc);
    return NextResponse.json(sonuc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Cron GİB Sync] Hata", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
