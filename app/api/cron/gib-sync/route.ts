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

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  console.info("[GİB Sync] HTTP tetikleme başladı");
  const sonuc = await runGibSync();
  console.info("[GİB Sync] HTTP tetikleme tamamlandı", sonuc);

  return NextResponse.json(sonuc, { status: sonuc.ok ? 200 : 503 });
}
