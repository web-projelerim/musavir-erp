"use client";

import { useState } from "react";
import { FileWarning } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createGonderimKaydi } from "@/lib/firebase/repositories";
import { getOfisId } from "@/lib/domain/office";
import { whatsappGonderimYurut, buildBelgeWhatsAppMessage } from "@/lib/domain/whatsappGonderim";
import type { Musteri, WhatsAppEntegrasyonAyari } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteri: Pick<Musteri, "id" | "firmaAdi" | "telefon" | "gsm1">;
  ayar: WhatsAppEntegrasyonAyari | undefined;
  ofisId?: string;
}

/**
 * Müşteriden eksik belge talebi. Talep hem mükellef panelinde (kanal=panel)
 * hem de WhatsApp'ta (ayara göre otomatik/onay) görünür. Mükellef sadece alır.
 */
export function BelgeTalepModal({ open, onClose, musteri, ayar, ofisId }: Props) {
  const toast = useToast();
  const [aciklama, setAciklama] = useState("");
  const [donem, setDonem] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGonder = async () => {
    if (!aciklama.trim()) {
      toast.error("Belge açıklaması gerekli", "Hangi belgelerin talep edildiğini yazın");
      return;
    }
    setLoading(true);
    try {
      const mesaj = buildBelgeWhatsAppMessage({
        musteriAdi: musteri.firmaAdi,
        donem: donem.trim() || undefined,
        aciklama: aciklama.trim(),
      }, ayar);

      if (isFirebaseConfigured) {
        // 1) Panel kaydı — mükellef panelinde her zaman görünür
        await createGonderimKaydi({
          ofisId: getOfisId(ofisId),
          kanal: "panel",
          musteriId: musteri.id,
          musteriAdi: musteri.firmaAdi,
          sablonId: "belge",
          mesaj,
          durum: "gonderildi",
          sentAt: new Date().toISOString(),
        });

        // 2) WhatsApp — ayara göre otomatik gönder / onay kuyruğu / pasif
        const telefon = musteri.gsm1 || musteri.telefon;
        let waNot = "";
        if (telefon) {
          const sonuc = await whatsappGonderimYurut({
            ayar,
            tur: "belge",
            ofisId,
            musteriId: musteri.id,
            musteriAdi: musteri.firmaAdi,
            telefon,
            mesaj,
            sablonId: "belge",
            firebaseAcik: isFirebaseConfigured,
          });
          if (sonuc.karar === "otomatik" && sonuc.gonderildi) waNot = "WhatsApp ile de gönderildi.";
          else if (sonuc.karar === "onay_bekle") waNot = "WhatsApp mesajı onay kuyruğuna eklendi.";
          else if (sonuc.karar === "pasif") waNot = "WhatsApp belge bildirimi ayarlardan kapalı.";
        } else {
          waNot = "Müşteri telefonu yok — yalnızca panele eklendi.";
        }
        toast.success("Belge talebi iletildi", `${musteri.firmaAdi} panelinde görünecek. ${waNot}`.trim());
      } else {
        toast.info("Demo modu", "Firebase yapılandırılmadığı için kayıt oluşturulmadı");
      }

      setAciklama("");
      setDonem("");
      onClose();
    } catch (err) {
      toast.error("Belge talebi iletilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Eksik Belge Talep Et" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <FileWarning className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <p className="text-xs text-amber-800">
            Talep <strong>{musteri.firmaAdi}</strong> mükellef panelinde görünecek ve (ayarlarınıza göre) WhatsApp ile iletilecek.
          </p>
        </div>
        <Input
          label="Dönem (opsiyonel)"
          value={donem}
          onChange={(e) => setDonem(e.target.value)}
          placeholder="örn. 2026-06"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Talep edilen belgeler</label>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={3}
            placeholder="örn. Alış faturaları, banka ekstresi, personel bordroları"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>İptal</Button>
          <Button onClick={handleGonder} loading={loading}>Talebi Gönder</Button>
        </div>
      </div>
    </Modal>
  );
}
