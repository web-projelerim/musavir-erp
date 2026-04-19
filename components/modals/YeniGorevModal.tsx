"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { MOCK_MUSTERILER } from "@/lib/data/mock";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  onSuccess?: () => void;
}

export function YeniGorevModal({ open, onClose, musteriId, onSuccess }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    baslik: "",
    aciklama: "",
    musteriId: musteriId ?? "",
    atananKisi: "Selin Kaya",
    terminTarihi: today,
    oncelik: "normal",
    tip: "beyanname",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baslik.trim()) {
      toast.error("Görev başlığı zorunludur");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(false);
    toast.success("Görev oluşturuldu", `"${form.baslik}" görevi atandı`);
    onClose();
    onSuccess?.();
  };

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  const musteriOptions = [
    { value: "", label: "— Müşteri seçin (isteğe bağlı) —" },
    ...MOCK_MUSTERILER.map((m) => ({ value: m.id, label: m.firmaAdi })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Yeni Görev Oluştur" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Görev Başlığı *"
          placeholder="Örn: KDV Beyannamesi Hazırla - Temmuz 2024"
          {...f("baslik")}
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama</label>
          <textarea
            value={form.aciklama}
            onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
            rows={2}
            placeholder="Görev hakkında ek bilgi..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
        <Select label="Müşteri" {...f("musteriId")} options={musteriOptions} />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Öncelik"
            {...f("oncelik")}
            options={[
              { value: "dusuk", label: "Düşük" },
              { value: "normal", label: "Normal" },
              { value: "yuksek", label: "Yüksek" },
              { value: "kritik", label: "Kritik" },
            ]}
          />
          <Select
            label="Görev Türü"
            {...f("tip")}
            options={[
              { value: "beyanname", label: "Beyanname" },
              { value: "tebligat", label: "Tebligat" },
              { value: "tahsilat", label: "Tahsilat" },
              { value: "belge", label: "Belge" },
              { value: "kdv2", label: "KDV2" },
              { value: "diger", label: "Diğer" },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Termin Tarihi" type="date" {...f("terminTarihi")} required />
          <Select
            label="Atanan Kişi"
            {...f("atananKisi")}
            options={[
              { value: "Selin Kaya", label: "Selin Kaya" },
              { value: "Murat Çelik", label: "Murat Çelik" },
              { value: "Ali Müşavir", label: "Ali Müşavir" },
            ]}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" loading={loading}>
            Görevi Oluştur
          </Button>
        </div>
      </form>
    </Modal>
  );
}
