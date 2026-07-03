/**
 * GET /api/cron/vergi-takvimi-sync
 *
 * Günlük cron: GİB vergi takvimini çeker, Firestore'a yazar, değişiklikleri tespit eder.
 * Vercel Cron tarafından çağrılır (vercel.json).
 *
 * Mevcut yıl + sonraki yıl için ayrı ayrı tetikler (Aralık'ta sonraki yılı kaçırmamak için).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function tetikleSync(baseUrl: string, yil: number, cronSecret: string) {
  try {
    const res = await fetch(`${baseUrl}/api/vergi-takvimi/sync?yil=${yil}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cronSecret}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(90_000),
    });
    const data = await res.json();
    return {
      yil,
      ok: data?.ok === true,
      olaySayisi: Array.isArray(data?.olaylar) ? data.olaylar.length : 0,
      guncellemeSayisi: Array.isArray(data?.guncellemeler) ? data.guncellemeler.length : 0,
      hata: data?.error,
    };
  } catch (err) {
    return {
      yil,
      ok: false,
      olaySayisi: 0,
      guncellemeSayisi: 0,
      hata: err instanceof Error ? err.message : "Bilinmeyen hata",
    };
  }
}

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const buYil = new Date().getFullYear();

  console.info("[Vergi Takvimi Cron] Başladı", new Date().toISOString());
  const sonuclar = [
    await tetikleSync(baseUrl, buYil, process.env.CRON_SECRET!),
    await tetikleSync(baseUrl, buYil + 1, process.env.CRON_SECRET!),
  ];
  console.info("[Vergi Takvimi Cron] Tamamlandı", sonuclar);

  const toplamGuncelleme = sonuclar.reduce((s, r) => s + r.guncellemeSayisi, 0);

  return NextResponse.json({
    ok: sonuclar.every((s) => s.ok),
    sonuclar,
    toplamGuncelleme,
    tarih: new Date().toISOString(),
  });
}
