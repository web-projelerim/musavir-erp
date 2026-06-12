/**
 * POST /api/secrets/encrypt
 *
 * Genel şifreleme endpoint'i. Müşteri kart formundan gelen SGK/e-Bildirge/e-Devlet
 * gibi credential'ları sunucuda şifreler, şifreli hali döndürür.
 *
 * Body: { plaintext: string } veya { fields: Record<string, string> }
 * Yanıt: { encrypted: string } veya { encrypted: Record<string, string> }
 *
 * Gerekli env: SECRET_KEY (veya GIB_SECRET_KEY backwards-compat)
 */

import { NextRequest, NextResponse } from "next/server";
import { encryptSecret, isEncrypted } from "@/lib/security/secrets";
import { requireAuth } from "@/lib/firebase/verifyToken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!await requireAuth(req)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }
  try {
    const body = await req.json() as { plaintext?: string; fields?: Record<string, string> };

    if (body.plaintext !== undefined) {
      return NextResponse.json({
        ok: true,
        encrypted: isEncrypted(body.plaintext) ? body.plaintext : encryptSecret(body.plaintext),
      });
    }
    if (body.fields && typeof body.fields === "object") {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.fields)) {
        if (typeof v !== "string" || !v.trim()) continue;
        out[k] = isEncrypted(v) ? v : encryptSecret(v);
      }
      return NextResponse.json({ ok: true, encrypted: out });
    }
    return NextResponse.json({ error: "plaintext veya fields gerekli" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Şifreleme başarısız";
    console.error("[Secrets Encrypt] HATA:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
