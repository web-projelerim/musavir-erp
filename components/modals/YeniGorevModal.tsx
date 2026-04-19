"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/context/ToastContext";
import { gorevEkle } from "@/lib/services/gorev.service";
import { useMusteriler } from "@/lib/hooks/useMusteriler";
import { FB_CONFIGURED } from "@/lib/firebase/ready";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  onSuccess?: (id: string) => void;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: 12, color: "#374151",
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function YeniGorevModal({ open, onClose, musteriId, onSuccess }: Props) {
  const toast = useToast();
  const { data: musteriler } = useMusteriler();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    baslik: "", aciklama: "",
    musteriId: musteriId ?? "",
    atananKisi: "Selin Kaya",
    terminTarihi: today,
    oncelik: "normal",
    tip: "beyanname",
  });

  useEffect(() => {
    if (musteriId) setForm((p) => ({ ...p, musteriId }));
  }, [musteriId]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baslik.trim()) { toast.error("Görev başlığı zorunludur"); return; }

    setLoading(true);
    try {
      const musteri = musteriler.find((m) => m.id === form.musteriId);
      const data = {
        baslik: form.baslik.trim(),
        aciklama: form.aciklama,
        musteriId: form.musteriId,
        musteriAdi: musteri?.firmaAdi ?? "",
        atananKisi: form.atananKisi,
        atayanKisi: "Ali Müşavir",
        terminTarihi: form.terminTarihi,
        oncelik: form.oncelik as any,
        durum: "beklemede" as const,
        tip: form.tip as any,
        createdAt: new Date().toISOString(),
      };

      let id = `g-${Date.now()}`;
      if (FB_CONFIGURED) {
        id = await gorevEkle(data);
      }
      toast.success("Görev oluşturuldu", `"${form.baslik}" görevi atandı`);
      onSuccess?.(id);
      onClose();
      setForm({ baslik: "", aciklama: "", musteriId: musteriId ?? "",
        atananKisi: "Selin Kaya", terminTarihi: today, oncelik: "normal", tip: "beyanname" });
    } catch {
      toast.error("Görev eklenemedi", "Lütfen tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yeni Görev Oluştur"
      subtitle="Bir müşteriye görev oluşturun ve personele atayın" size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Görev Başlığı *">
          <input value={form.baslik} onChange={(e) => set("baslik", e.target.value)}
            placeholder="Örn: KDV Beyannamesi Hazırla - Temmuz 2024" required style={fieldStyle} />
        </Field>
        <Field label="Açıklama">
          <textarea value={form.aciklama} onChange={(e) => set("aciklama", e.target.value)}
            rows={2} placeholder="Görev hakkında ek bilgi..."
            style={{ ...fieldStyle, resize: "none" }} />
        </Field>
        <Field label="Müşteri">
          <select value={form.musteriId} onChange={(e) => set("musteriId", e.target.value)}
            style={fieldStyle}>
            <option value="">— Müşteri seçin —</option>
            {musteriler.map((m) => (
              <option key={m.id} value={m.id}>{m.firmaAdi}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Öncelik">
            <select value={form.oncelik} onChange={(e) => set("oncelik", e.target.value)}
              style={fieldStyle}>
              <option value="dusuk">Düşük</option>
              <option value="normal">Normal</option>
              <option value="yuksek">Yüksek</option>
              <option value="kritik">Kritik</option>
            </select>
          </Field>
          <Field label="Görev Türü">
            <select value={form.tip} onChange={(e) => set("tip", e.target.value)}
              style={fieldStyle}>
              <option value="beyanname">Beyanname</option>
              <option value="tebligat">Tebligat</option>
              <option value="tahsilat">Tahsilat</option>
              <option value="belge">Belge</option>
              <option value="kdv2">KDV2</option>
              <option value="diger">Diğer</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Termin Tarihi *">
            <input type="date" value={form.terminTarihi}
              onChange={(e) => set("terminTarihi", e.target.value)} required style={fieldStyle} />
          </Field>
          <Field label="Atanan Kişi">
            <select value={form.atananKisi} onChange={(e) => set("atananKisi", e.target.value)}
              style={fieldStyle}>
              {["Selin Kaya", "Murat Çelik", "Ali Müşavir"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3"
          style={{ borderTop: "1px solid #f3f4f6" }}>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>İptal</Button>
          <Button type="submit" size="sm" loading={loading}>Görevi Oluştur</Button>
        </div>
      </form>
    </Modal>
  );
}
