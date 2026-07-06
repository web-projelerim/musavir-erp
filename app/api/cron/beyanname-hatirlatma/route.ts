/**
 * GET /api/cron/beyanname-hatirlatma
 *
 * Son tarihi yaklaşan, verilmemiş beyannameler için MÜŞAVİRE hatırlatma üretir
 * (uygulama-içi bildirim + müşavir WhatsApp özeti). Müvekkile gitmez.
 *
 * Otomatik çalışma: instrumentation.ts içindeki node-cron (varsayılan 08:00)
 * loopback + CRON_SECRET ile tetikler. Harici tetikleme de desteklenir.
 *
 * İş mantığı: lib/jobs/beyanname-hatirlatma.ts → runBeyannameHatirlatma()
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { runBeyannameHatirlatma } from "@/lib/jobs/beyanname-hatirlatma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  console.info("[Cron Beyanname Hatırlatma] Başladı", new Date().toISOString());
  const sonuc = await runBeyannameHatirlatma();
  console.info("[Cron Beyanname Hatırlatma] Tamamlandı", sonuc);

  return NextResponse.json(sonuc, { status: sonuc.ok ? 200 : 503 });
}
