/**
 * GET /api/cron/edefter-hatirlatma
 *
 * E-Defter berat gönderimi yaklaşan mükellefler için MÜŞAVİRE hatırlatma üretir
 * (uygulama-içi bildirim + müşavir WhatsApp özeti). Müvekkile gitmez.
 *
 * Otomatik çalışma: instrumentation.ts içindeki node-cron (varsayılan her ayın
 * 26'sı 08:00) loopback + CRON_SECRET ile tetikler. Harici tetikleme de desteklenir.
 *
 * İş mantığı: lib/jobs/edefter-hatirlatma.ts → runEDefterHatirlatma()
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { runEDefterHatirlatma } from "@/lib/jobs/edefter-hatirlatma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  console.info("[Cron E-Defter Hatırlatma] Başladı", new Date().toISOString());
  const sonuc = await runEDefterHatirlatma();
  console.info("[Cron E-Defter Hatırlatma] Tamamlandı", sonuc);

  return NextResponse.json(sonuc, { status: sonuc.ok ? 200 : 503 });
}
