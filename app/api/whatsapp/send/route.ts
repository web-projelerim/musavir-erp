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
import { requireAuth } from "@/lib/firebase/verifyToken";

const META_API = "https://graph.facebook.com/v19.0";
const DEFAULT_TEMPLATE = "musavir_hatirlatma";
const DEFAULT_LANG = "tr";

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

// Telefon numarasını E.164 formatına çevir (Türkiye: +90...)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return `+90${digits.slice(1)}`;
  }
  if (digits.startsWith("90") && digits.length === 12) {
    return `+${digits}`;
  }
  if (!phone.startsWith("+")) {
    return `+${digits}`;
  }
  return phone.replace(/\s/g, "");
}

function buildTextPayload(to: string, body: string) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body },
  };
}

function buildTemplatePayload(
  to: string,
  templateName: string,
  params: string[]
) {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: DEFAULT_LANG },
      components: [
        {
          type: "body",
          parameters: params.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };
}

async function sendSingle(
  phoneNumberId: string,
  accessToken: string,
  item: MesajItem,
  useTemplate: boolean,
  templateName: string
): Promise<{ musteriId: string; basarili: boolean; hataMesaji?: string }> {
  const to = normalizePhone(item.phone);

  const payload =
    useTemplate && item.templateParams && item.templateParams.length > 0
      ? buildTemplatePayload(to, templateName, item.templateParams)
      : buildTextPayload(to, item.body);

  try {
    const res = await fetch(`${META_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { musteriId: item.musteriId, basarili: true };
    }

    const errData = await res.json().catch(() => ({}));
    const errMsg =
      errData?.error?.message ??
      errData?.error?.error_data?.details ??
      `HTTP ${res.status}`;
    return { musteriId: item.musteriId, basarili: false, hataMesaji: errMsg };
  } catch (err) {
    return {
      musteriId: item.musteriId,
      basarili: false,
      hataMesaji: err instanceof Error ? err.message : "Bilinmeyen hata",
    };
  }
}

export async function POST(req: NextRequest) {
  if (!await requireAuth(req)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
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
    const {
      messages,
      useTemplate = false,
      templateName = DEFAULT_TEMPLATE,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages dizisi boş" }, { status: 400 });
    }

    const results = await Promise.all(
      messages.map((m) =>
        sendSingle(phoneNumberId, accessToken, m, useTemplate, templateName)
      )
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
