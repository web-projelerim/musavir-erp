"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/context/ToastContext";
import { musteriEkle } from "@/lib/services/musteri.service";
import { MOCK_MUSTERILER } from "@/lib/data/mock";
import { FB_CONFIGURED } from "@/lib/firebase/ready";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

const PERSONEL = ["Selin Kaya", "Murat Çelik", "Ali Müşavir"];

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

export function YeniMusteriModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firmaAdi: "", vknTckn: "", yetkiliAd: "", telefon: "",
    email: "", adres: "", sorumluPersonel: "Selin Kaya",
    kdvMukellef: true, muhtasarMukellef: true,
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firmaAdi.trim()) { toast.error("Firma adı zorunludur"); return; }
    if (form.vknTckn.length < 10) { toast.error("VKN/TCKN 10 veya 11 haneli olmalı"); return; }

    setLoading(true);
    try {
      const data = {
        firmaAdi: form.firmaAdi.trim(),
        vknTckn: form.vknTckn.trim(),
        yetkiliAd: form.yetkiliAd,
        telefon: form.telefon,
        email: form.email,
        adres: form.adres,
        sorumluPersonel: form.sorumluPersonel,
        kdvMukellef: form.kdvMukellef,
        muhtasarMukellef: form.muhtasarMukellef,
        durum: "aktif" as const,
        riskSeviyesi: "dusuk" as const,
        riskSkoru: 10,
        tahsilatDurumu: "bekliyor" as const,
        gorevDurumu: "Temiz",
        gecikmisPesinat: false,
        sonGuncelleme: new Date().toISOString(),
      };

      let id = `m-${Date.now()}`;
      if (FB_CONFIGURED) {
        id = await musteriEkle(data);
      }
      toast.success("Müşteri oluşturuldu", `${form.firmaAdi} sisteme eklendi`);
      onSuccess?.(id);
      onClose();
      setForm({
        firmaAdi: "", vknTckn: "", yetkiliAd: "", telefon: "",
        email: "", adres: "", sorumluPersonel: "Selin Kaya",
        kdvMukellef: true, muhtasarMukellef: true,
      });
    } catch {
      toast.error("Müşteri eklenemedi", "Lütfen tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yeni Müşteri Ekle"
      subtitle="Müşteri bilgilerini girerek portföyünüze ekleyin" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Firma Adı *">
              <input value={form.firmaAdi} onChange={(e) => set("firmaAdi", e.target.value)}
                placeholder="Örn: Akdeniz Tekstil A.Ş." required style={fieldStyle} />
            </Field>
          </div>
          <Field label="VKN / TCKN *">
            <input value={form.vknTckn} onChange={(e) => set("vknTckn", e.target.value)}
              placeholder="10 veya 11 hane" maxLength={11} required style={fieldStyle} />
          </Field>
          <Field label="Yetkili Kişi">
            <input value={form.yetkiliAd} onChange={(e) => set("yetkiliAd", e.target.value)}
              placeholder="Ad Soyad" style={fieldStyle} />
          </Field>
          <Field label="Telefon">
            <input value={form.telefon} onChange={(e) => set("telefon", e.target.value)}
              type="tel" placeholder="0532 000 0000" style={fieldStyle} />
          </Field>
          <Field label="E-posta">
            <input value={form.email} onChange={(e) => set("email", e.target.value)}
              type="email" placeholder="info@firma.com" style={fieldStyle} />
          </Field>
          <div className="col-span-2">
            <Field label="Adres">
              <input value={form.adres} onChange={(e) => set("adres", e.target.value)}
                placeholder="İl, İlçe" style={fieldStyle} />
            </Field>
          </div>
          <Field label="Sorumlu Personel">
            <select value={form.sorumluPersonel}
              onChange={(e) => set("sorumluPersonel", e.target.value)}
              style={fieldStyle}>
              {PERSONEL.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="KDV Mükellefi">
              <select value={form.kdvMukellef ? "evet" : "hayir"}
                onChange={(e) => set("kdvMukellef", e.target.value === "evet")}
                style={fieldStyle}>
                <option value="evet">Evet</option>
                <option value="hayir">Hayır</option>
              </select>
            </Field>
            <Field label="Muhtasar">
              <select value={form.muhtasarMukellef ? "evet" : "hayir"}
                onChange={(e) => set("muhtasarMukellef", e.target.value === "evet")}
                style={fieldStyle}>
                <option value="evet">Evet</option>
                <option value="hayir">Hayır</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4"
          style={{ borderTop: "1px solid #f3f4f6" }}>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>İptal</Button>
          <Button type="submit" size="sm" loading={loading}>Müşteri Ekle</Button>
        </div>
      </form>
    </Modal>
  );
}
