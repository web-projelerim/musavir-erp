"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAuth } from "@/lib/context/AuthContext";
import { displayVknTckn } from "@/lib/utils/maskData";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createBeyanname } from "@/lib/firebase/repositories";
import type { Beyanname, BeyannameType, Musteri } from "@/lib/types";

const BEYAN_TURLERI: { value: BeyannameType; label: string }[] = [
  { value: "KDV", label: "KDV (Katma Değer Vergisi)" },
  { value: "MUHTAS", label: "Muhtasar Beyanname" },
  { value: "KURUM", label: "Kurumlar Vergisi" },
  { value: "GELIR", label: "Gelir Vergisi" },
  { value: "GECICI", label: "Geçici Vergi" },
  { value: "DIGER", label: "Diğer" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  musteriler: Musteri[];
  onCreated?: (beyanname: Beyanname) => void;
  defaultMusteriId?: string;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function defaultSonTarih() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 25);
  return next.toISOString().slice(0, 10);
}

export function YeniBeyanameModal({ open, onClose, musteriler, onCreated, defaultMusteriId }: Props) {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    musteriId: defaultMusteriId ?? (musteriler[0]?.id ?? ""),
    tur: "KDV" as BeyannameType,
    donem: currentMonthValue(),
    sonTarih: defaultSonTarih(),
    sorumlu: user?.ad ? `${user.ad} ${user.soyad ?? ""}`.trim() : "",
    vergiTutari: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const musteri = musteriler.find((m) => m.id === form.musteriId);
    if (!musteri) {
      toast.error("Mükellef seçilmedi");
      return;
    }
    if (!form.donem || !form.sonTarih) {
      toast.error("Dönem ve son tarih zorunludur");
      return;
    }
    setSaving(true);
    try {
      const input: Omit<Beyanname, "id"> = {
        musteriId: musteri.id,
        musteriAdi: musteri.firmaAdi,
        tur: form.tur,
        donem: form.donem,
        sonTarih: new Date(form.sonTarih).toISOString(),
        durum: "bekliyor",
        yasamDongusuDurum: "planlandi",
        sorumlu: form.sorumlu,
        vergiTutari: form.vergiTutari ? Number(form.vergiTutari) : undefined,
        kaynakSistem: "manual",
      };

      let created: Beyanname;
      if (isFirebaseConfigured) {
        created = await createBeyanname(input);
      } else {
        created = { id: `bey-local-${Date.now()}`, ...input };
      }

      await logAudit({
        action: "create",
        entityType: "beyanname",
        entityId: created.id,
        entityLabel: `${musteri.firmaAdi} - ${form.tur} ${form.donem}`,
        summary: `${form.tur} beyannamesi oluşturuldu`,
        after: created as unknown as Record<string, unknown>,
      });

      toast.success("Beyanname oluşturuldu", `${musteri.firmaAdi} — ${form.tur} ${form.donem}`);
      onCreated?.(created);
      onClose();
    } catch (err) {
      toast.error("Beyanname oluşturulamadı", parseFirestoreError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yeni Beyanname">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Mükellef"
          value={form.musteriId}
          onChange={(e) => set("musteriId", e.target.value)}
          required
        >
          <option value="">Mükellef seçin</option>
          {musteriler.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firmaAdi} — {displayVknTckn(m.vknTckn, user)}
            </option>
          ))}
        </Select>

        <Select
          label="Beyanname Türü"
          value={form.tur}
          onChange={(e) => set("tur", e.target.value as BeyannameType)}
          required
        >
          {BEYAN_TURLERI.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dönem (YYYY-MM)"
            type="month"
            value={form.donem}
            onChange={(e) => set("donem", e.target.value)}
            required
          />
          <Input
            label="Son Tarih"
            type="date"
            value={form.sonTarih}
            onChange={(e) => set("sonTarih", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Sorumlu"
            value={form.sorumlu}
            onChange={(e) => set("sorumlu", e.target.value)}
            placeholder="Sorumlu kişi adı"
          />
          <Input
            label="Vergi Tutarı (₺)"
            type="number"
            min="0"
            step="0.01"
            value={form.vergiTutari}
            onChange={(e) => set("vergiTutari", e.target.value)}
            placeholder="Opsiyonel"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            İptal
          </Button>
          <Button type="submit" loading={saving}>
            Beyanname Oluştur
          </Button>
        </div>
      </form>
    </Modal>
  );
}
