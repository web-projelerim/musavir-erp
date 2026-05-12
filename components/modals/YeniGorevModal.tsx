"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Gorev, GorevOncelik, GorevTip } from "@/lib/types";

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

  const defaultForm = {
    baslik: "",
    aciklama: "",
    musteriId: musteriId ?? "",
    atananKisi: currentUserFullName,
    terminTarihi: today,
    oncelik: "normal",
    tip: "beyanname",
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (open) setForm({ ...defaultForm, atananKisi: currentUserFullName });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  // Gerçek kullanıcılardan atanan kişi listesi (musavir + personel)
  const atananOptions = useMemo(() => {
    const ofisKullanicilari = kullanicilar
      .filter((u) => u.rol === "musavir" || u.rol === "personel")
      .map((u) => ({ value: `${u.ad} ${u.soyad}`.trim(), label: `${u.ad} ${u.soyad}`.trim() }));
    // Mevcut kullanıcı listede yoksa ekle (demo mod için)
    if (currentUserFullName && !ofisKullanicilari.some((o) => o.value === currentUserFullName)) {
      ofisKullanicilari.unshift({ value: currentUserFullName, label: currentUserFullName });
    }
    return ofisKullanicilari.length > 0
      ? ofisKullanicilari
      : [{ value: currentUserFullName || "Sistem", label: currentUserFullName || "Sistem" }];
  }, [kullanicilar, currentUserFullName]);

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
            options={atananOptions}
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
