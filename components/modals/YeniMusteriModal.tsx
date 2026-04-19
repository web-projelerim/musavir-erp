"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function YeniMusteriModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firmaAdi: "",
    vknTckn: "",
    yetkiliAd: "",
    telefon: "",
    email: "",
    adres: "",
    sorumluPersonel: "Selin Kaya",
    kdvMukellef: "evet",
    muhtasarMukellef: "evet",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firmaAdi || !form.vknTckn) {
      toast.error("Firma adı ve VKN zorunludur");
      return;
    }
    if (form.vknTckn.length < 10) {
      toast.error("VKN/TCKN 10 veya 11 haneli olmalıdır");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    toast.success("Müşteri oluşturuldu", `${form.firmaAdi} başarıyla sisteme eklendi`);
    onClose();
    onSuccess?.();
  };

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  return (
    <Modal open={open} onClose={onClose} title="Yeni Müşteri Ekle" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
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
            <Input label="Yetkili Kişi" placeholder="Ad Soyad" {...f("yetkiliAd")} />
            <Input label="Telefon" type="tel" placeholder="0532 000 0000" {...f("telefon")} />
            <Input label="E-posta" type="email" placeholder="info@firma.com" {...f("email")} />
            <div className="col-span-2">
              <Input label="Adres" placeholder="İl, İlçe" {...f("adres")} />
            </div>
            <Select
              label="Sorumlu Personel"
              {...f("sorumluPersonel")}
              options={[
                { value: "Selin Kaya", label: "Selin Kaya" },
                { value: "Murat Çelik", label: "Murat Çelik" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" loading={loading}>
            Müşteri Ekle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
