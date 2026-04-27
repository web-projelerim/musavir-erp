"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAuth } from "@/lib/context/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createBelge } from "@/lib/firebase/repositories";
import { uploadBelgeFile } from "@/lib/firebase/storage";
import type { Belge, BelgeGorunurluk, BelgeKategori } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId?: string;
  defaultGorunurluk?: BelgeGorunurluk;
  onUploaded?: (belge: Belge) => void;
}

function formatBoyut(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BelgeUploadModal({
  open,
  onClose,
  musteriId,
  defaultGorunurluk = "mukellef",
  onUploaded,
}: Props) {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { user } = useAuth();
  const { musteriler } = useAppData();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    musteriId: musteriId ?? "",
    kategori: "diger" as BelgeKategori,
    gorunurluk: defaultGorunurluk,
    notlar: "",
  });

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setForm({
      musteriId: musteriId ?? "",
      kategori: "diger",
      gorunurluk: defaultGorunurluk,
      notlar: "",
    });
  }, [defaultGorunurluk, musteriId, open]);

  const selectedMusteri = musteriler.find((musteri) => musteri.id === form.musteriId);
  const musteriOptions = musteriler.map((musteri) => ({
    value: musteri.id,
    label: musteri.firmaAdi,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Dosya seçin");
      return;
    }

    if (!selectedMusteri) {
      toast.error("Müşteri seçimi zorunludur");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error("Dosya çok büyük", "12 MB altında bir dosya seçin");
      return;
    }

    setLoading(true);
    try {
      let url = URL.createObjectURL(file);
      let storagePath: string | undefined;

      if (isFirebaseConfigured) {
        const upload = await uploadBelgeFile(selectedMusteri.id, file);
        url = upload.url;
        storagePath = upload.storagePath;
      }

      const payload: Omit<Belge, "id" | "createdAt"> = {
        musteriId: selectedMusteri.id,
        musteriAdi: selectedMusteri.firmaAdi,
        dosyaAdi: file.name,
        dosyaTipi: file.type || "application/octet-stream",
        boyut: file.size,
        url,
        storagePath,
        kategori: form.kategori,
        gorunurluk: form.gorunurluk,
        yukleyen: user ? `${user.ad} ${user.soyad}` : "Demo Kullanıcı",
        yukleyenRol: user?.rol ?? "musavir",
        notlar: form.notlar.trim() || undefined,
      };

      const belge = isFirebaseConfigured
        ? await createBelge(payload)
        : {
            id: `doc-${Date.now()}`,
            ...payload,
            createdAt: new Date().toISOString(),
          };

      onUploaded?.(belge);
      await logAudit({
        action: "upload",
        entityType: "belge",
        entityId: belge.id,
        entityLabel: belge.dosyaAdi,
        summary: "Belge yüklendi",
        after: {
          musteriId: belge.musteriId,
          kategori: belge.kategori,
          gorunurluk: belge.gorunurluk,
          boyut: belge.boyut,
        },
      });
      toast.success("Belge yüklendi", `${file.name} kaydedildi`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Belge yüklenemedi", "Firebase Storage ve Firestore yetkilerini kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Belge Yükle" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Müşteri"
          disabled={Boolean(musteriId)}
          value={form.musteriId}
          onChange={(e) => setForm({ ...form, musteriId: e.target.value })}
          options={musteriOptions}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Dosya</label>
          <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {file ? file.name : "Dosya seç veya sürükle"}
            </span>
            <span className="text-xs text-slate-400">
              {file ? formatBoyut(file.size) : "PDF, Excel, Word veya görsel — maks. 12 MB"}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Kategori"
            value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value as BelgeKategori })}
            options={[
              { value: "beyanname", label: "Beyanname" },
              { value: "tebligat", label: "Tebligat" },
              { value: "rapor", label: "Rapor" },
              { value: "sozlesme", label: "Sözleşme" },
              { value: "fatura", label: "Fatura" },
              { value: "diger", label: "Diğer" },
            ]}
          />
          <Select
            label="Görünürlük"
            value={form.gorunurluk}
            onChange={(e) => setForm({ ...form, gorunurluk: e.target.value as BelgeGorunurluk })}
            options={[
              { value: "mukellef", label: "Mükellef görsün" },
              { value: "musavir", label: "Sadece ofis" },
            ]}
          />
        </div>
        <Input
          label="Not"
          value={form.notlar}
          onChange={(e) => setForm({ ...form, notlar: e.target.value })}
          placeholder="Belgeyle ilgili kısa not"
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" loading={loading}>
            Yükle
          </Button>
        </div>
      </form>
    </Modal>
  );
}
