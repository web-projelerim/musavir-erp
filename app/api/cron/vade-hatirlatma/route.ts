/**
 * GET /api/cron/vade-hatirlatma
 *
 * Vade tarihi yaklaşan/gecikmiş, ödenmemiş tahakkuklar için hatırlatma üretir.
 * Otomatik çalışma: instrumentation.ts içindeki node-cron (varsayılan her sabah 09:00)
 * loopback üzerinden CRON_SECRET ile tetikler. Harici tetikleme de desteklenir.
 *
 * İş mantığı: lib/jobs/vade-hatirlatma.ts → runVadeHatirlatma()
 * Güvenlik: CRON_SECRET env değişkeni ile doğrulama yapılır (fail-closed).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { runVadeHatirlatma } from "@/lib/jobs/vade-hatirlatma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  console.info("[Cron Vade Hatırlatma] Başladı", new Date().toISOString());
  const sonuc = await runVadeHatirlatma();
  console.info("[Cron Vade Hatırlatma] Tamamlandı", sonuc);

  return NextResponse.json(sonuc, { status: sonuc.ok ? 200 : 503 });
}
