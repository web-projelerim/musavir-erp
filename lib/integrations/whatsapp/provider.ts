/**
 * WhatsApp mesaj gönderici.
 *
 * Önce /api/whatsapp/send rotasını dener (Meta Cloud API).
 * Rota 501 döndürürse (env yok) ya da çağrı başarısız olursa
 * istemci simülasyon moduna düşer — geliştirme ortamında
 * gerçek mesaj gönderilmez ama kayıt yine oluşturulur.
 *
 * useTemplate = true → Meta onaylı şablon gönderir (24 saat penceresi dışında zorunlu).
 * useTemplate = false (default) → serbest metin gönderir (oturum içi).
 */

export interface WhatsAppMessage {
  musteriId: string;
  musteriAdi: string;
  phone: string;
  body: string;
  /** Şablon modunda doldurulacak parametreler: [firma_adi, beyan_turu, son_tarih, ...] */
  templateParams?: string[];
}

export interface WhatsAppSendResult {
  musteriId: string;
  basarili: boolean;
  hataMesaji?: string;
  simulated?: boolean;
}

export interface SendOptions {
  /** true → type:template (oturum dışı); false/undefined → type:text (oturum içi) */
  useTemplate?: boolean;
  /** Meta Business Manager'da onaylı şablon adı; default: "musavir_hatirlatma" */
  templateName?: string;
}

function hasValidPhone(phone: string) {
  return phone.replace(/\D/g, "").length >= 10;
}

export async function sendWhatsAppMessages(
  messages: WhatsAppMessage[],
  options: SendOptions = {}
): Promise<WhatsAppSendResult[]> {
  const { useTemplate = false, templateName } = options;

  // Geçersiz numaraları hemen reddet
  const invalid = messages
    .filter((m) => !hasValidPhone(m.phone))
    .map((m) => ({
      musteriId: m.musteriId,
      basarili: false,
      hataMesaji: "Geçerli telefon numarası yok",
    }));

  const valid = messages.filter((m) => hasValidPhone(m.phone));
  if (valid.length === 0) return invalid;

  try {
    const payload: Record<string, unknown> = { messages: valid, useTemplate };
    if (templateName) payload.templateName = templateName;

    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // 501 → env tanımlı değil, simülasyon moduna geç
    if (res.status === 501) {
      console.info("[WhatsApp] Env tanımlı değil — simülasyon modu");
      return [
        ...invalid,
        ...valid.map((m) => ({
          musteriId: m.musteriId,
          basarili: true,
          simulated: true,
        })),
      ];
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `HTTP ${res.status}`);
    }

    const data = await res.json();
    const apiResults: WhatsAppSendResult[] = (data.results ?? []).map(
      (r: { musteriId: string; basarili: boolean; hataMesaji?: string }) => ({
        musteriId: r.musteriId,
        basarili: r.basarili,
        hataMesaji: r.hataMesaji,
        simulated: false,
      })
    );

    return [...invalid, ...apiResults];
  } catch (err) {
    console.error("[WhatsApp provider]", err);
    return [
      ...invalid,
      ...valid.map((m) => ({
        musteriId: m.musteriId,
        basarili: false,
        hataMesaji: err instanceof Error ? err.message : "Bağlantı hatası",
      })),
    ];
  }
}
