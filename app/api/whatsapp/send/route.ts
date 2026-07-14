/**
 * POST /api/whatsapp/send
 *
 * Meta Cloud API üzerinden WhatsApp mesajı gönderir.
 * Hem serbest metin (type: text) hem onaylı şablon (type: template) destekler.
 *
 * Gerekli env değişkenleri:
 *   WHATSAPP_ACCESS_TOKEN    — Meta Cloud API bearer token
 *   WHATSAPP_PHONE_NUMBER_ID — Business phone number ID (15 haneli)
 *
 * Env yoksa 501 döner (simülasyon moduna düşer, istemci bunu bekler).
 *
 * Body:
 *   {
 *     messages: Array<{
 *       phone: string;
 *       body: string;           ← serbest metin
 *       musteriId: string;
 *       musteriAdi: string;
 *       templateParams?: string[];  ← şablon parametreleri (useTemplate=true ise)
 *     }>;
 *     useTemplate?: boolean;        ← true → type:template gönder
 *     templateName?: string;        ← default: "musavir_hatirlatma"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/firebase/verifyToken";
import { assertMusterilerInOffice } from "@/lib/firebase/officeScope";
import { rateLimitDistributed } from "@/lib/security/rateLimit";
import { whatsappGonder, whatsappYapilandirildi } from "@/lib/integrations/whatsapp/server";

interface MesajItem {
  musteriId: string;
  musteriAdi: string;
  phone: string;
  body: string;
  /** Şablon modunda: [[firma_adi], [beyan_turu], [son_tarih], ...] */
  templateParams?: string[];
}

interface SendBody {
  messages: MesajItem[];
  /** true → onaylı Meta şablonu gönder (oturum dışı mesajlar için zorunlu) */
  useTemplate?: boolean;
  /** Kullanılacak şablon adı; default: musavir_hatirlatma */
  templateName?: string;
}

export async function POST(req: NextRequest) {
  const actor = await requireStaff(req);
  if (!actor) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }
  const rl = await rateLimitDistributed(`whatsapp-send:${actor.ofisId}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla gönderim isteği. Lütfen bekleyin." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  if (!whatsappYapilandirildi()) {
    return NextResponse.json(
      {
        ok: false,
        simulated: true,
        message:
          "WHATSAPP_ACCESS_TOKEN veya WHATSAPP_PHONE_NUMBER_ID env değişkeni tanımlanmamış",
      },
      { status: 501 }
    );
  }

  try {
    const body: SendBody = await req.json();
    const { messages, useTemplate = false, templateName } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages dizisi boş" }, { status: 400 });
    }

    // B9: Personel yalnızca kendi ofisindeki müşterilere gönderebilir.
    const scope = await assertMusterilerInOffice(
      messages.map((m) => m.musteriId),
      actor.ofisId
    );
    if (!scope.ok) {
      return NextResponse.json(
        {
          error: "Ofis dışı mükellef hedeflenemez",
          disallowed: scope.disallowed,
        },
        { status: 403 }
      );
    }

    const results = await Promise.all(
      messages.map(async (m) => {
        const sonuc = await whatsappGonder({
          phone: m.phone,
          body: m.body,
          useTemplate,
          templateParams: m.templateParams,
          templateName,
        });
        return { musteriId: m.musteriId, basarili: sonuc.ok, hataMesaji: sonuc.hataMesaji };
      })
    );

    const basarili = results.filter((r) => r.basarili).length;
    return NextResponse.json({
      ok: true,
      basarili,
      toplam: results.length,
      useTemplate,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[WhatsApp Send]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
