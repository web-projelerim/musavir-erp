"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { upsertDocument } from "@/lib/firebase/firestore";
import { uploadBelgeFile } from "@/lib/firebase/storage";
import { createBelge } from "@/lib/firebase/repositories";
import { getOfisId } from "@/lib/domain/office";
import { sozlesmedenTahakkukTuretClient } from "@/lib/domain/sozlesmeTahakkuk";
import type { GibSozlesme, Musteri, SozlesmeTuru } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteri: Musteri;
  sozlesme?: GibSozlesme;
  onSaved?: (s: GibSozlesme) => void;
}

const EMPTY = {
  sozlesmeNo: "",
  sozlesmeTuru: "beyanname" as SozlesmeTuru,
  basTarihi: new Date().toISOString().slice(0, 10),
  bitTarihi: "",
  aylikUcret: "",
  kdvOrani: "20",
  durum: "gecerli" as "gecerli" | "sonlanmis" | "iptal",
  otomatikTahakkukOlustur: true,
};

export function SozlesmeModal({ open, onClose, musteri, sozlesme, onSaved }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(sozlesme);

  useEffect(() => {
    if (!open) return;
    if (sozlesme) {
      setForm({
        sozlesmeNo: sozlesme.sozlesmeNo,
        sozlesmeTuru: sozlesme.sozlesmeTuru,
        basTarihi: sozlesme.basTarihi.slice(0, 10),
        bitTarihi: sozlesme.bitTarihi?.slice(0, 10) ?? "",
        aylikUcret: sozlesme.aylikUcret?.toString() ?? "",
        kdvOrani: sozlesme.kdvOrani?.toString() ?? "20",
        durum: sozlesme.durum,
        otomatikTahakkukOlustur: false,
      });
    } else {
      setForm(EMPTY);
    }
    setPdfFile(null);
  }, [sozlesme, open]);

  const set = <K extends keyof typeof EMPTY>(field: K, value: (typeof EMPTY)[K]) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sozlesmeNo.trim()) {
      toast.error("Sözleşme numarası zorunludur");
      return;
    }
    setLoading(true);
    try {
      const id = sozlesme?.id ?? `soz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let pdfUrl = sozlesme?.pdfUrl;
      let yeniPdfStoragePath: string | undefined;

      if (pdfFile && isFirebaseConfigured) {
        try {
          const uploaded = await uploadBelgeFile(musteri.id, pdfFile);
          pdfUrl = uploaded.url;
          yeniPdfStoragePath = uploaded.storagePath;
        } catch (err) {
          console.error("[Sözleşme PDF upload]", err);
          toast.warning("PDF yüklenemedi", err instanceof Error ? err.message : undefined);
        }
      }

      const payload: GibSozlesme = {
        id,
        ofisId: getOfisId(user?.ofisId),
        musteriId: musteri.id,
        musteriAdi: musteri.firmaAdi,
        vknTckn: musteri.vknTckn,
        sozlesmeTuru: form.sozlesmeTuru,
        sozlesmeNo: form.sozlesmeNo.trim(),
        basTarihi: form.basTarihi,
        bitTarihi: form.bitTarihi || undefined,
        aylikUcret: form.aylikUcret ? Number(form.aylikUcret.replace(",", ".")) : undefined,
        kdvOrani: form.kdvOrani ? Number(form.kdvOrani) : undefined,
        durum: form.durum,
        kaynak: "manual",
        pdfUrl,
        syncTarihi: new Date().toISOString(),
        createdAt: sozlesme?.createdAt ?? new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        await upsertDocument("gibSozlesmeleri", payload);

        // Yeni sözleşme PDF'i yüklendiyse Belgeler sekmesinde de görünsün
        if (pdfFile && pdfUrl) {
          try {
            await createBelge({
              ofisId: getOfisId(user?.ofisId),
              musteriId: musteri.id,
              musteriAdi: musteri.firmaAdi,
              dosyaAdi: pdfFile.name,
              dosyaTipi: pdfFile.type || "application/pdf",
              boyut: pdfFile.size,
              url: pdfUrl,
              storagePath: yeniPdfStoragePath,
              kategori: "sozlesme",
              gorunurluk: "musavir",
              yukleyen: user ? `${user.ad} ${user.soyad}` : "Ofis",
              yukleyenRol: user?.rol ?? "musavir",
              notlar: `${form.sozlesmeNo.trim()} nolu sözleşme`,
            });
          } catch (err) {
            console.error("[Sözleşme belge kaydı]", err);
          }
        }

        // Otomatik aylık tahakkuk oluştur (sadece yeni sözleşme + işaretli + geçerli + ücretli)
        if (!isEdit && form.otomatikTahakkukOlustur && payload.durum === "gecerli" && payload.aylikUcret) {
          const donem = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          const tahakkuk = sozlesmedenTahakkukTuretClient(payload, donem, user?.id);
          if (tahakkuk) {
            await upsertDocument("tahakkuklar", tahakkuk);
            toast.success("Sözleşme + aylık tahakkuk oluşturuldu", `${donem} dönemi için ₺${payload.aylikUcret.toLocaleString("tr-TR")} tahakkuk türetildi`);
          }
        } else {
          toast.success(isEdit ? "Sözleşme güncellendi" : "Sözleşme kaydedildi");
        }
      } else {
        toast.info("Demo modu", "Firebase aktif değil; sözleşme yerel olarak gösterilecek");
      }

      onSaved?.(payload);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Sözleşme kaydedilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Sözleşme Düzenle" : "Yeni Sözleşme"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-800">
          🔗 <strong>{musteri.firmaAdi}</strong> için sözleşme bilgisi giriyorsunuz.
          Geçerli + aylık ücretli sözleşmeler için bu ayın tahakkuğu otomatik türetilebilir.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Sözleşme Türü"
            value={form.sozlesmeTuru}
            onChange={(e) => set("sozlesmeTuru", e.target.value as SozlesmeTuru)}
            options={[
              { value: "beyanname", label: "Beyanname Sözleşmesi" },
              { value: "ymm", label: "YMM Tasdik Sözleşmesi" },
            ]}
          />
          <Input
            label="Sözleşme No"
            value={form.sozlesmeNo}
            onChange={(e) => set("sozlesmeNo", e.target.value)}
            placeholder="GİB'den verilen no"
            required
          />
          <Input
            label="Başlangıç Tarihi"
            type="date"
            value={form.basTarihi}
            onChange={(e) => set("basTarihi", e.target.value)}
            required
          />
          <Input
            label="Bitiş Tarihi (opsiyonel)"
            type="date"
            value={form.bitTarihi}
            onChange={(e) => set("bitTarihi", e.target.value)}
          />
          <Input
            label="Aylık Ücret (Brüt KDV dahil ₺)"
            type="number"
            step="0.01"
            min="0"
            value={form.aylikUcret}
            onChange={(e) => set("aylikUcret", e.target.value)}
            placeholder="Örn: 5000"
          />
          <Select
            label="KDV Oranı"
            value={form.kdvOrani}
            onChange={(e) => set("kdvOrani", e.target.value)}
            options={[
              { value: "0", label: "%0 (İstisna)" },
              { value: "1", label: "%1" },
              { value: "10", label: "%10" },
              { value: "20", label: "%20" },
            ]}
          />
          <Select
            label="Durum"
            value={form.durum}
            onChange={(e) => set("durum", e.target.value as "gecerli" | "sonlanmis" | "iptal")}
            options={[
              { value: "gecerli", label: "Geçerli" },
              { value: "sonlanmis", label: "Sonlanmış" },
              { value: "iptal", label: "İptal" },
            ]}
          />
        </div>

        {/* PDF upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Sözleşme PDF (opsiyonel)</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white p-3 hover:border-blue-300 hover:bg-blue-50/30">
            <Upload className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-600 truncate">
              {pdfFile ? pdfFile.name : sozlesme?.pdfUrl ? "Yeni PDF yüklemek için tıklayın (mevcut olan korunur)" : "PDF seçmek için tıklayın"}
            </span>
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        {!isEdit && (
          <label className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <input
              type="checkbox"
              checked={form.otomatikTahakkukOlustur}
              onChange={(e) => set("otomatikTahakkukOlustur", e.target.checked)}
              className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            Bu ay için tahakkuk otomatik oluştur (geçerli + aylık ücretliyse)
          </label>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
          <Button type="submit" loading={loading}>{isEdit ? "Güncelle" : "Kaydet"}</Button>
        </div>
      </form>
    </Modal>
  );
}
