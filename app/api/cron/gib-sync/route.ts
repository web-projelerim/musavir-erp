/**
 * GET /api/cron/gib-sync
 *
 * Manuel tetikleme veya harici cron servisi için HTTP endpoint.
 * Otomatik çalışma için instrumentation.ts içindeki node-cron kullanılır.
 *
 * Güvenlik: CRON_SECRET env değişkeni ile doğrulanır.
 */

import { NextRequest, NextResponse } from "next/server";
import { runGibSync } from "@/lib/jobs/gib-sync";
import { verifyCronSecret } from "@/lib/security/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Captcha yoksa açıklayıcı yanıt dön (GİB artık captcha gerektiriyor)
  const url = new URL(req.url);
  const captchaDk = url.searchParams.get("dk") ?? undefined;
  const captchaImageID = url.searchParams.get("imageID") ?? undefined;

  console.info("[GİB Sync] HTTP tetikleme başladı");
  const sonuc = await runGibSync({ captchaDk, captchaImageID });
  console.info("[GİB Sync] HTTP tetikleme tamamlandı", sonuc);

  return NextResponse.json(sonuc, { status: sonuc.ok ? 200 : 503 });
}

export async function POST(req: NextRequest) {
  const auth = verifyCronSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { dk?: string; imageID?: string } = {};
  try { body = await req.json(); } catch { /* captcha yoksa da çalış */ }

  console.info("[GİB Sync] POST tetikleme başladı");
  const sonuc = await runGibSync({ captchaDk: body.dk, captchaImageID: body.imageID });
  console.info("[GİB Sync] POST tetikleme tamamlandı", sonuc);

  return NextResponse.json(sonuc, { status: sonuc.ok ? 200 : 503 });
}
