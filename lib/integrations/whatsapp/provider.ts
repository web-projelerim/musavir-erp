export interface WhatsAppMessage {
  musteriId: string;
  musteriAdi: string;
  phone: string;
  body: string;
}

export interface WhatsAppSendResult {
  musteriId: string;
  basarili: boolean;
  hataMesaji?: string;
}

function hasValidPhone(phone: string) {
  return phone.replace(/\D/g, "").length >= 10;
}

export async function sendWhatsAppMessages(messages: WhatsAppMessage[]): Promise<WhatsAppSendResult[]> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  return messages.map((message) => {
    if (!hasValidPhone(message.phone)) {
      return {
        musteriId: message.musteriId,
        basarili: false,
        hataMesaji: "Geçerli telefon numarası yok",
      };
    }

    return {
      musteriId: message.musteriId,
      basarili: true,
    };
  });
}
