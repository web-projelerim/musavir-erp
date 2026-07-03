/**
 * GET /api/cron/vade-hatirlatma
 *
 * Vercel Cron Job — her sabah 09:00'da otomatik çalışır (vercel.json).
 * Vade tarihi 3 gün içinde olan tahakkukları bulur,
 * müşterilere WhatsApp hatırlatması gönderir.
 *
 * Güvenlik: CRON_SECRET env değişkeni ile doğrulama yapılır.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  // Vercel Cron güvenlik doğrulaması (fail-closed)
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  try {
    console.info("[Cron Vade Hatırlatma] Başladı", new Date().toISOString());

    // Gerçek implementasyon için firebase-admin ile:
    // 1. Firestore'dan tüm ofislerin tahakkuklarını çek
    // 2. vadeTarihi <= now + 3 gün olanları filtrele
    // 3. Her tahakkuk için müşteri bilgisini al
    // 4. POST /api/whatsapp/send ile hatırlatma gönder
    // 5. gonderimler koleksiyonuna kayıt yaz
    // TODO(faz-2): firebase-admin eklenince aktif edilecek

    // Örnek: WhatsApp send'e iç istek yapısı
    // const res = await fetch(`${baseUrl}/api/whatsapp/send`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     messages: yaklasanTahakkuklar.map(t => ({
    //       musteriId: t.musteriId,
    //       musteriAdi: t.musteriAdi,
    //       phone: t.musteriTelefon,
    //       body: `Sayın ${t.musteriAdi}, ${formatPara(t.tutar)} tutarındaki tahakkukunuzun vade tarihi ${formatTarih(t.vadeTarihi)}'dir.`,
    //       templateParams: [t.musteriAdi, formatPara(t.tutar), formatTarih(t.vadeTarihi)],
    //     })),
    //     useTemplate: true,
    //   }),
    // });

    const sonuc = {
      ok: true,
      mesaj: "Vade hatırlatma cron çalıştı — firebase-admin entegrasyonu tamamlandığında aktif olacak",
      zaman: new Date().toISOString(),
      // gerçek implementasyonda: islenenTahakkuk, gonderilen, basarisiz
    };

    console.info("[Cron Vade Hatırlatma] Tamamlandı", sonuc);
    return NextResponse.json(sonuc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[Cron Vade Hatırlatma] Hata", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
