"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createGorev } from "@/lib/firebase/repositories";
import { getOfisId } from "@/lib/domain/office";
import type { AltGorev, Gorev, GorevOncelik, GorevTip } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  onCreated?: (gorev: Gorev) => void;
  onSuccess?: () => void;
}

export function YeniGorevModal({ open, onClose, musteriId, onCreated, onSuccess }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const logAudit = useAuditLog();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const { musteriler, kullanicilar } = useAppData();

  const currentUserFullName = user ? `${user.ad} ${user.soyad}`.trim() : "";

  const bosForm = () => ({
    baslik: "",
    aciklama: "",
    musteriId: musteriId ?? "",
    atananKisi: currentUserFullName,
    terminTarihi: new Date().toISOString().split("T")[0],
    oncelik: "normal",
    tip: "beyanname",
  });

  const [form, setForm] = useState(bosForm);
  const [altGorevler, setAltGorevler] = useState<AltGorev[]>([]);
  const [yeniAltGorev, setYeniAltGorev] = useState("");

  const altGorevEkle = () => {
    if (!yeniAltGorev.trim()) return;
    setAltGorevler((prev) => [
      ...prev,
      { id: `ag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, baslik: yeniAltGorev.trim(), tamamlandi: false },
    ]);
    setYeniAltGorev("");
  };

  const altGorevSil = (id: string) =>
    setAltGorevler((prev) => prev.filter((a) => a.id !== id));

  // Modal her açıldığında VEYA müşteri/kullanıcı değiştiğinde formu sıfırla
  useEffect(() => {
    if (open) {
      setForm(bosForm());
      setAltGorevler([]);
      setYeniAltGorev("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, musteriId, currentUserFullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baslik.trim()) {
      toast.error("Görev başlığı zorunludur");
      return;
    }
    setLoading(true);

    try {
      const seciliMusteri = musteriler.find((m) => m.id === form.musteriId);
      let createdGorev: Gorev;

      const atayanKisi = currentUserFullName || "Sistem";
      if (isFirebaseConfigured) {
        createdGorev = await createGorev({
          ofisId: getOfisId(user?.ofisId),
          baslik: form.baslik,
          aciklama: form.aciklama,
          musteriId: form.musteriId,
          musteriAdi: seciliMusteri?.firmaAdi ?? "Genel",
          atananKisi: form.atananKisi,
          atayanKisi,
          terminTarihi: form.terminTarihi,
          oncelik: form.oncelik as GorevOncelik,
          tip: form.tip as GorevTip,
          altGorevler: altGorevler.length > 0 ? altGorevler : undefined,
        });
      } else {
        await new Promise((r) => setTimeout(r, 700));
        createdGorev = {
          id: `g-${Date.now()}`,
          ofisId: getOfisId(user?.ofisId),
          baslik: form.baslik,
          aciklama: form.aciklama,
          musteriId: form.musteriId,
          musteriAdi: seciliMusteri?.firmaAdi ?? "Genel",
          atananKisi: form.atananKisi,
          atayanKisi,
          terminTarihi: form.terminTarihi,
          oncelik: form.oncelik as GorevOncelik,
          durum: "beklemede",
          tip: form.tip as GorevTip,
          altGorevler: altGorevler.length > 0 ? altGorevler : undefined,
          createdAt: new Date().toISOString(),
        };
      }

      await logAudit({
        action: "create",
        entityType: "gorev",
        entityId: createdGorev.id,
        entityLabel: createdGorev.baslik,
        summary: "Görev oluşturuldu",
        after: {
          tip: createdGorev.tip,
          oncelik: createdGorev.oncelik,
          musteriId: createdGorev.musteriId,
        },
      });
      toast.success("Görev oluşturuldu", `"${form.baslik}" görevi atandı`);
      setForm(bosForm()); // form'u temizle ki bir sonraki açılışta eski veri görünmesin
      onCreated?.(createdGorev);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Görev kaydedilemedi", parseFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  const musteriOptions = [
    { value: "", label: "— Müşteri seçin (isteğe bağlı) —" },
    ...musteriler.map((m) => ({ value: m.id, label: m.firmaAdi })),
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
        <Input label="Termin Tarihi" type="date" {...f("terminTarihi")} required />

        {/* Alt görevler / Checklist */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Alt Görevler <span className="font-normal text-slate-400 text-xs">(opsiyonel — checklist)</span>
          </label>
          {altGorevler.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {altGorevler.map((a, idx) => (
                <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                  <span className="flex-1 text-sm text-slate-800 truncate">{a.baslik}</span>
                  <button type="button" onClick={() => altGorevSil(a.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={yeniAltGorev}
              onChange={(e) => setYeniAltGorev(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  altGorevEkle();
                }
              }}
              placeholder="Örn: Belgeleri topla, Müşteri onayı al, Kontrol et..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={altGorevEkle}
              disabled={!yeniAltGorev.trim()}
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Ekle
            </button>
          </div>
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
