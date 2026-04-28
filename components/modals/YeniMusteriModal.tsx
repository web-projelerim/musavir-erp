"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createMusteri, updateMusteri } from "@/lib/firebase/repositories";
import type { Musteri } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  musteri?: Musteri;
}

const EMPTY_FORM = {
  firmaAdi: "",
  vknTckn: "",
  vergiDairesi: "",
  kurulusTarihi: "",
  yetkiliAd: "",
  telefon: "",
  email: "",
  adres: "",
  aciklama: "",
  sorumluPersonel: "Selin Kaya",
  kdvMukellef: "evet",
  muhtasarMukellef: "evet",
  varsayilanHizmetUcreti: "",
};

export function YeniMusteriModal({ open, onClose, onSuccess, musteri }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const isEdit = Boolean(musteri);

  useEffect(() => {
    if (!open) return;

    if (musteri) {
      setForm({
        firmaAdi: musteri.firmaAdi,
        vknTckn: musteri.vknTckn,
        vergiDairesi: musteri.vergiDairesi ?? "",
        kurulusTarihi: musteri.kurulusTarihi ?? "",
        yetkiliAd: musteri.yetkiliAd,
        telefon: musteri.telefon,
        email: musteri.email,
        adres: musteri.adres,
        aciklama: musteri.aciklama ?? "",
        sorumluPersonel: musteri.sorumluPersonel,
        kdvMukellef: musteri.kdvMukellef ? "evet" : "hayir",
        muhtasarMukellef: musteri.muhtasarMukellef ? "evet" : "hayir",
        varsayilanHizmetUcreti: musteri.varsayilanHizmetUcreti?.toString() ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [musteri, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firmaAdi || !form.vknTckn) {
      toast.error("Firma adı ve VKN zorunludur");
      return;
    }
    if (form.vknTckn.replace(/\D/g, "").length < 10) {
      toast.error("VKN/TCKN 10 veya 11 haneli olmalıdır");
      return;
    }
    setLoading(true);

    try {
      const ucret = form.varsayilanHizmetUcreti
        ? Number(form.varsayilanHizmetUcreti.replace(",", "."))
        : undefined;

      if (isFirebaseConfigured) {
        const payload = {
          firmaAdi: form.firmaAdi,
          vknTckn: form.vknTckn.replace(/\D/g, ""),
          vergiDairesi: form.vergiDairesi || undefined,
          kurulusTarihi: form.kurulusTarihi || undefined,
          yetkiliAd: form.yetkiliAd,
          telefon: form.telefon,
          email: form.email,
          adres: form.adres,
          aciklama: form.aciklama || undefined,
          sorumluPersonel: form.sorumluPersonel,
          kdvMukellef: form.kdvMukellef === "evet",
          muhtasarMukellef: form.muhtasarMukellef === "evet",
          varsayilanHizmetUcreti: Number.isFinite(ucret) ? ucret : undefined,
        };

        if (musteri) {
          await updateMusteri(musteri.id, payload);
        } else {
          await createMusteri(payload);
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
      }

      toast.success(
        isEdit ? "Müşteri güncellendi" : "Müşteri oluşturuldu",
        `${form.firmaAdi} başarıyla ${isEdit ? "güncellendi" : "sisteme eklendi"}`
      );
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Müşteri kaydedilemedi", "Firebase bağlantısı veya yetkileri kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Müşteri Bilgilerini Düzenle" : "Yeni Müşteri Ekle"} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">

          {/* Firma bilgileri */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Firma Adı *" placeholder="Örn: Akdeniz Tekstil A.Ş." {...f("firmaAdi")} required />
            </div>
            <Input
              label="VKN / TCKN *"
              placeholder="10 veya 11 hane"
              maxLength={11}
              {...f("vknTckn")}
              required
            />
            <Input label="Vergi Dairesi" placeholder="Örn: Bağcılar" {...f("vergiDairesi")} />
            <Input label="Yetkili Kişi" placeholder="Ad Soyad" {...f("yetkiliAd")} />
            <Input label="Kuruluş Tarihi" type="date" {...f("kurulusTarihi")} />
          </div>

          {/* İletişim */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefon" type="tel" placeholder="0532 000 0000" {...f("telefon")} />
            <Input label="E-posta" type="email" placeholder="info@firma.com" {...f("email")} />
            <div className="col-span-2">
              <Input label="Adres" placeholder="İl, İlçe" {...f("adres")} />
            </div>
          </div>

          {/* Sorumluluk ve ücret */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sorumlu Personel"
              {...f("sorumluPersonel")}
              options={[
                { value: "Selin Kaya", label: "Selin Kaya" },
                { value: "Murat Çelik", label: "Murat Çelik" },
              ]}
            />
            <Input
              label="Aylık Hizmet Ücreti (₺)"
              placeholder="Örn: 3500"
              {...f("varsayilanHizmetUcreti")}
            />
          </div>

          {/* Mükellef durumu */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="KDV Mükellefi"
              {...f("kdvMukellef")}
              options={[
                { value: "evet", label: "Evet" },
                { value: "hayir", label: "Hayır" },
              ]}
            />
            <Select
              label="Muhtasar Mükellefi"
              {...f("muhtasarMukellef")}
              options={[
                { value: "evet", label: "Evet" },
                { value: "hayir", label: "Hayır" },
              ]}
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Müşteri hakkında notlar..."
              {...f("aciklama")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Değişiklikleri Kaydet" : "Müşteri Ekle"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
