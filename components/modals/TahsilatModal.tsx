"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createTahsilat, updateTahsilat } from "@/lib/firebase/repositories";
import type { Tahsilat, TahsilatDurum } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  tahsilat?: Tahsilat | null;
  onSaved?: (tahsilat: Tahsilat) => void;
}

const today = () => new Date().toISOString().split("T")[0];

export function TahsilatModal({ open, onClose, musteriId, tahsilat, onSaved }: Props) {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { musteriler } = useAppData();
  const [loading, setLoading] = useState(false);

  const defaultMusteriId = musteriId ?? musteriler[0]?.id ?? "";
  const defaultDonem = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [form, setForm] = useState({
    musteriId: defaultMusteriId,
    donem: defaultDonem,
    tutar: "",
    odenenTutar: "",
    vadeTarihi: today(),
    durum: "bekliyor" as TahsilatDurum,
    notlar: "",
  });

  useEffect(() => {
    if (!open) return;

    if (tahsilat) {
      setForm({
        musteriId: tahsilat.musteriId,
        donem: tahsilat.donem,
        tutar: String(tahsilat.tutar),
        odenenTutar: tahsilat.odenenTutar ? String(tahsilat.odenenTutar) : "",
        vadeTarihi: tahsilat.vadeTarihi.slice(0, 10),
        durum: tahsilat.durum,
        notlar: tahsilat.notlar ?? "",
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      musteriId: defaultMusteriId,
      donem: defaultDonem,
      tutar: "",
      odenenTutar: "",
      vadeTarihi: today(),
      durum: "bekliyor",
      notlar: "",
    }));
  }, [defaultDonem, defaultMusteriId, open, tahsilat]);

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value }),
  });

  const musteriOptions = musteriler.map((musteri) => ({ value: musteri.id, label: musteri.firmaAdi }));
  const selectedMusteri = musteriler.find((musteri) => musteri.id === form.musteriId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tutar = Number(form.tutar);
    const odenenTutar = Number(form.odenenTutar || 0);

    if (!form.musteriId || !selectedMusteri) {
      toast.error("Müşteri seçimi zorunludur");
      return;
    }

    if (!Number.isFinite(tutar) || tutar <= 0) {
      toast.error("Geçerli bir tahsilat tutarı girin");
      return;
    }

    const durum: TahsilatDurum =
      odenenTutar >= tutar ? "odendi" :
      odenenTutar > 0 ? "kismi" :
      form.durum;

    const payload: Omit<Tahsilat, "id"> = {
      musteriId: selectedMusteri.id,
      musteriAdi: selectedMusteri.firmaAdi,
      tutar,
      odenenTutar: odenenTutar || undefined,
      donem: form.donem,
      vadeTarihi: form.vadeTarihi,
      odemeTarihi: durum === "odendi" || durum === "kismi" ? today() : undefined,
      durum,
      notlar: form.notlar.trim() || undefined,
    };

    setLoading(true);
    try {
      let saved: Tahsilat;

      if (tahsilat) {
        saved = { ...tahsilat, ...payload };
        if (isFirebaseConfigured) await updateTahsilat(tahsilat.id, payload);
      } else if (isFirebaseConfigured) {
        saved = await createTahsilat(payload);
      } else {
        saved = { id: `th-${Date.now()}`, ...payload };
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      onSaved?.(saved);
      await logAudit({
        action: tahsilat ? "update" : "create",
        entityType: "tahsilat",
        entityId: saved.id,
        entityLabel: `${saved.musteriAdi} - ${saved.donem}`,
        summary: tahsilat ? "Tahsilat güncellendi" : "Tahsilat oluşturuldu",
        before: tahsilat ? (tahsilat as unknown as Record<string, unknown>) : undefined,
        after: saved as unknown as Record<string, unknown>,
      });
      toast.success(tahsilat ? "Tahsilat güncellendi" : "Tahsilat oluşturuldu");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Tahsilat kaydedilemedi", parseFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tahsilat ? "Tahsilat Güncelle" : "Yeni Tahsilat"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Müşteri"
          disabled={Boolean(musteriId)}
          options={musteriOptions}
          {...f("musteriId")}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Dönem" placeholder="2026-04" {...f("donem")} required />
          <Input label="Vade Tarihi" type="date" {...f("vadeTarihi")} required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Tutar" type="number" min="0" step="0.01" {...f("tutar")} required />
          <Input label="Ödenen Tutar" type="number" min="0" step="0.01" {...f("odenenTutar")} />
        </div>
        <Select
          label="Durum"
          options={[
            { value: "bekliyor", label: "Bekliyor" },
            { value: "gecikti", label: "Gecikti" },
            { value: "kismi", label: "Kısmi" },
            { value: "odendi", label: "Ödendi" },
          ]}
          {...f("durum")}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Not</label>
          <textarea
            value={form.notlar}
            onChange={(e) => setForm({ ...form, notlar: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" loading={loading}>
            Kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
