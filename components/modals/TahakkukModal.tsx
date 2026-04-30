"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createGonderimKaydi, createTahakkuk } from "@/lib/firebase/repositories";
import { buildTahakkukPanelLink, buildTahakkukWhatsAppMessage } from "@/lib/domain/tahakkuk";
import { getOfisId } from "@/lib/domain/office";
import type { HizmetTuru, Tahakkuk, TahakkukKaynakSistem, TahakkukTuru, VergiTahakkukTuru } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  /** Varsayılan ve tek izin verilen tür. Belirtilmezse her iki tür seçilebilir. */
  defaultTahakkukTuru?: TahakkukTuru;
  onSaved?: (tahakkuk: Tahakkuk) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function TahakkukModal({ open, onClose, musteriId, defaultTahakkukTuru, onSaved }: Props) {
  const { musteriler } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();
  const defaultMusteri = musteriler.find((m) => m.id === musteriId) ?? musteriler[0];
  const defaultDonem = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const initialTur = defaultTahakkukTuru ?? "hizmet";
  const [form, setForm] = useState({
    musteriId: defaultMusteri?.id ?? "",
    donem: defaultDonem,
    tahakkukTuru: initialTur as TahakkukTuru,
    hizmetTuru: "mali_musavirlik" as HizmetTuru,
    vergiTuru: "KDV" as VergiTahakkukTuru,
    resmiTahakkukFisNo: "",
    kaynakSistem: "manual" as TahakkukKaynakSistem,
    tutar: String(defaultMusteri?.varsayilanHizmetUcreti ?? ""),
    vadeTarihi: today(),
    aciklama: "",
    whatsappPlanla: true,
  });
  const [loading, setLoading] = useState(false);

  const selectedMusteri = musteriler.find((m) => m.id === form.musteriId);

  const f = (field: keyof typeof form) => ({
    value: form[field] as string,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value })),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const tutar = Number(form.tutar);
    if (!selectedMusteri || !Number.isFinite(tutar) || tutar <= 0) {
      toast.error("Müşteri ve geçerli tutar zorunludur");
      return;
    }

    const panelLinki = buildTahakkukPanelLink(selectedMusteri.id);
    setLoading(true);
    try {
      let saved: Tahakkuk;
      const payload = {
        ofisId: getOfisId(user?.ofisId),
        musteriId: selectedMusteri.id,
        musteriAdi: selectedMusteri.firmaAdi,
        donem: form.donem,
        tahakkukTuru: form.tahakkukTuru,
        hizmetTuru: form.tahakkukTuru === "hizmet" ? form.hizmetTuru : undefined,
        vergiTuru: form.tahakkukTuru === "vergi" ? form.vergiTuru : undefined,
        resmiTahakkukFisNo: form.tahakkukTuru === "vergi" ? form.resmiTahakkukFisNo || undefined : undefined,
        kaynakSistem: form.tahakkukTuru === "vergi" ? form.kaynakSistem : undefined,
        tutar,
        odenenTutar: 0,
        vadeTarihi: form.vadeTarihi,
        durum: "bekliyor" as const,
        bildirimDurumu: form.whatsappPlanla ? ("planlandi" as const) : ("kapali" as const),
        panelLinki,
        aciklama: form.aciklama || undefined,
        createdBy: user?.id ?? "system",
      };

      if (isFirebaseConfigured) {
        saved = await createTahakkuk(payload);
        if (form.whatsappPlanla) {
          await createGonderimKaydi({
            ofisId: getOfisId(user?.ofisId),
            kanal: "whatsapp",
            musteriId: selectedMusteri.id,
            musteriAdi: selectedMusteri.firmaAdi,
            sablonId: "tahakkuk",
            icerikRef: saved.id,
            mesaj: buildTahakkukWhatsAppMessage({
              firmaAdi: selectedMusteri.firmaAdi,
              donem: form.donem,
              tutar,
              panelLinki,
            }),
            durum: "bekliyor",
          });
        }
      } else {
        saved = { id: `tk-${Date.now()}`, ...payload, createdAt: new Date().toISOString() };
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      onSaved?.(saved);
      await logAudit({
        action: "create",
        entityType: "tahakkuk",
        entityId: saved.id,
        entityLabel: `${saved.musteriAdi} - ${saved.donem}`,
        summary: "Tahakkuk oluşturuldu",
        after: saved as unknown as Record<string, unknown>,
      });
      toast.success("Tahakkuk oluşturuldu");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Tahakkuk kaydedilemedi", parseFirestoreError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yeni Tahakkuk" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Müşteri"
          disabled={Boolean(musteriId)}
          value={form.musteriId}
          onChange={(event) => setForm((prev) => ({ ...prev, musteriId: event.target.value }))}
          options={musteriler.map((m) => ({ value: m.id, label: m.firmaAdi }))}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Dönem" {...f("donem")} required />
          <Input label="Vade Tarihi" type="date" {...f("vadeTarihi")} required />
        </div>
        <Select
          label="Tahakkuk Tipi"
          value={form.tahakkukTuru}
          disabled={Boolean(defaultTahakkukTuru)}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              tahakkukTuru: event.target.value as TahakkukTuru,
              tutar:
                event.target.value === "hizmet"
                  ? String(selectedMusteri?.varsayilanHizmetUcreti ?? prev.tutar)
                  : prev.tutar,
            }))
          }
          options={[
            { value: "hizmet", label: "Ofis Hizmet Tahakkuku" },
            { value: "vergi", label: "Resmi Vergi Tahakkuku" },
          ]}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {form.tahakkukTuru === "hizmet" ? (
            <Select
              label="Hizmet Türü"
              value={form.hizmetTuru}
              onChange={(event) => setForm((prev) => ({ ...prev, hizmetTuru: event.target.value as HizmetTuru }))}
              options={[
                { value: "mali_musavirlik", label: "Mali Müşavirlik" },
                { value: "beyanname", label: "Beyanname" },
                { value: "danismanlik", label: "Danışmanlık" },
                { value: "diger", label: "Diğer" },
              ]}
            />
          ) : (
            <Select
              label="Vergi Türü"
              value={form.vergiTuru}
              onChange={(event) => setForm((prev) => ({ ...prev, vergiTuru: event.target.value as VergiTahakkukTuru }))}
              options={[
                { value: "KDV", label: "KDV" },
                { value: "MUHTASAR", label: "Muhtasar" },
                { value: "GECICI_VERGI", label: "Geçici Vergi" },
                { value: "KURUMLAR", label: "Kurumlar Vergisi" },
                { value: "GELIR", label: "Gelir Vergisi" },
                { value: "DAMGA", label: "Damga Vergisi" },
                { value: "SGK", label: "SGK" },
                { value: "DIGER", label: "Diğer" },
              ]}
            />
          )}
          <Input label="Tutar" type="number" min="0" step="0.01" {...f("tutar")} required />
        </div>
        {form.tahakkukTuru === "vergi" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Resmi Tahakkuk Fiş No" {...f("resmiTahakkukFisNo")} />
            <Select
              label="Kaynak Sistem"
              value={form.kaynakSistem}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, kaynakSistem: event.target.value as TahakkukKaynakSistem }))
              }
              options={[
                { value: "manual", label: "Manuel" },
                { value: "gib", label: "GİB" },
                { value: "luca", label: "Luca" },
              ]}
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Açıklama</label>
          <textarea
            value={form.aciklama}
            onChange={(event) => setForm((prev) => ({ ...prev, aciklama: event.target.value }))}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.whatsappPlanla}
            onChange={(event) => setForm((prev) => ({ ...prev, whatsappPlanla: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          WhatsApp tahakkuk bildirimi planla
        </label>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
          <Button type="submit" loading={loading}>Tahakkuk Oluştur</Button>
        </div>
      </form>
    </Modal>
  );
}
