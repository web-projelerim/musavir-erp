/**
 * GET /api/gib/captcha
 *
 * GİB IVD'den captcha görselini çekip base64 olarak döndürür.
 * Frontend'de <img src={`data:image/jpeg;base64,${imageBase64}`}> ile gösterin.
 * imageID'yi login sırasında dk ile birlikte /api/gib/sync'e gönderin.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchGibCaptcha } from "@/lib/integrations/gib/ivd-client";
import { requireStaff } from "@/lib/firebase/verifyToken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Açık proxy olarak kötüye kullanımı engelle: yalnızca ofis personeli
  if (!await requireStaff(req)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }
  try {
    const captcha = await fetchGibCaptcha();
    return NextResponse.json(captcha);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Captcha alınamadı";
    console.error("[GİB Captcha]", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
