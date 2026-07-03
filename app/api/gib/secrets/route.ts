/**
 * POST /api/gib/secrets
 *
 * Plaintext GİB kimlik bilgilerini sunucu tarafında AES-256-GCM ile şifreler,
 * şifreli halini döndürür. İstemci bu şifreli veriyi Firestore'a saklar.
 * Gerçek şifreler hiçbir zaman Firestore'a yazılmaz.
 *
 * Gerekli env: GIB_SECRET_KEY (en az 32 karakter rastgele string)
 */

import { NextRequest, NextResponse } from "next/server";
import { gibEncrypt } from "@/lib/integrations/gib/encrypt";
import { requireStaff } from "@/lib/firebase/verifyToken";

interface SecretsBody {
  ivdSifre?: string;
  ebeyannameParola?: string;
  ebeyannameSifre?: string;
  sgkSifre?: string;
}

export async function POST(req: NextRequest) {
  if (!await requireStaff(req, { allowedRoles: ["musavir"] })) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }
  try {
    if (!process.env.GIB_SECRET_KEY) {
      return NextResponse.json(
        { error: "GIB_SECRET_KEY env değişkeni tanımlanmamış. .env.local dosyasına ekleyin." },
        { status: 500 }
      );
    }

    const body: SecretsBody = await req.json();
    const result: Record<string, string> = {};

    if (body.ivdSifre?.trim()) {
      result.ivdSifre = gibEncrypt(body.ivdSifre.trim());
    }
    if (body.ebeyannameParola?.trim()) {
      result.ebeyannameParola = gibEncrypt(body.ebeyannameParola.trim());
    }
    if (body.ebeyannameSifre?.trim()) {
      result.ebeyannameSifre = gibEncrypt(body.ebeyannameSifre.trim());
    }
    if (body.sgkSifre?.trim()) {
      result.sgkSifre = gibEncrypt(body.sgkSifre.trim());
    }

    return NextResponse.json({ ok: true, encrypted: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
