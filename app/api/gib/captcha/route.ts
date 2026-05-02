/**
 * GET /api/gib/captcha
 *
 * GİB IVD'den captcha görselini çekip base64 olarak döndürür.
 * Frontend'de <img src={`data:image/jpeg;base64,${imageBase64}`}> ile gösterin.
 * imageID'yi login sırasında dk ile birlikte /api/gib/sync'e gönderin.
 */

import { NextResponse } from "next/server";
import { fetchGibCaptcha } from "@/lib/integrations/gib/ivd-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const captcha = await fetchGibCaptcha();
    return NextResponse.json(captcha);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Captcha alınamadı";
    console.error("[GİB Captcha]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
