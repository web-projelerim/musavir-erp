import "server-only";

/**
 * Sunucu tarafı WhatsApp gönderimi (Meta Cloud API).
 *
 * Hem HTTP route (/api/whatsapp/send) hem de cron job'ları (vade-hatirlatma)
 * tarafından kullanılır — tek gönderim mantığı, kod tekrarı yok.
 *
 * Gerekli env:
 *   WHATSAPP_ACCESS_TOKEN    — Meta Cloud API bearer token
 *   WHATSAPP_PHONE_NUMBER_ID — Business phone number ID (15 haneli)
 *
 * Env yoksa gönderim yapılmaz; { ok:false, simulated:true } döner
 * (çağıran taraf gonderim kaydını yine de yazabilir).
 */

const META_API = "https://graph.facebook.com/v19.0";
const DEFAULT_TEMPLATE = "musavir_hatirlatma";
const DEFAULT_LANG = "tr";

export interface WhatsAppGonderimSonuc {
  ok: boolean;
  simulated?: boolean;
  hataMesaji?: string;
}

export interface WhatsAppGonderimGirdi {
  phone: string;
  body: string;
  /** true → onaylı Meta şablonu gönder (oturum dışı mesajlar için zorunlu) */
  useTemplate?: boolean;
  /** Şablon parametreleri (useTemplate=true ise) */
  templateParams?: string[];
  /** Kullanılacak şablon adı; default: musavir_hatirlatma */
  templateName?: string;
}

/** WhatsApp env değişkenleri tanımlı mı? */
export function whatsappYapilandirildi(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Telefon numarasını E.164 formatına çevir (Türkiye: +90...) */
export function normalizePhone(phone: string): string {
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

function buildTemplatePayload(to: string, templateName: string, params: string[]) {
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

/**
 * Tek bir WhatsApp mesajı gönderir. Env eksikse simüle eder (gönderim yapmaz).
 * Asla throw etmez — sonucu obje olarak döner.
 */
export async function whatsappGonder(girdi: WhatsAppGonderimGirdi): Promise<WhatsAppGonderimSonuc> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return { ok: false, simulated: true, hataMesaji: "WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID tanımlı değil" };
  }

  const to = normalizePhone(girdi.phone);
  const templateName = girdi.templateName ?? DEFAULT_TEMPLATE;
  const payload =
    girdi.useTemplate && girdi.templateParams && girdi.templateParams.length > 0
      ? buildTemplatePayload(to, templateName, girdi.templateParams)
      : buildTextPayload(to, girdi.body);

  try {
    const res = await fetch(`${META_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { ok: true };

    const errData = await res.json().catch(() => ({}));
    const errMsg =
      errData?.error?.message ??
      errData?.error?.error_data?.details ??
      `HTTP ${res.status}`;
    return { ok: false, hataMesaji: errMsg };
  } catch (err) {
    return { ok: false, hataMesaji: err instanceof Error ? err.message : "Bilinmeyen hata" };
  }
}
