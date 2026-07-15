"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/lib/context/ToastContext";
import { useAuth } from "@/lib/context/AuthContext";
import { isFirebaseConfigured, authHeaders } from "@/lib/firebase/client";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { createOrtak, updateOrtak } from "@/lib/firebase/repositories";
import { toDateInputValue } from "@/lib/utils/format";
import type { Ortak } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriId: string;
  ofisId?: string;
  ortak?: Ortak | null;
  onSuccess?: () => void;
}

const BOS = {
  ad: "",
  soyad: "",
  tckn: "",
  dogumTarihi: "",
  kimlikSeriNo: "",
  edevletSifresi: "",
  hisseAdedi: "",
  hisseOrani: "",
  sermaye: "",
};

export function OrtakModal({ open, onClose, musteriId, ofisId, ortak, onSuccess }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(BOS);
  const [loading, setLoading] = useState(false);
  const [showSifre, setShowSifre] = useState(false);
  const isEdit = Boolean(ortak);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    if (ortak) {
      setForm({
        ad: ortak.ad ?? "",
        soyad: ortak.soyad ?? "",
        tckn: ortak.tckn ?? "",
        dogumTarihi: toDateInputValue(ortak.dogumTarihi),
        kimlikSeriNo: ortak.kimlikSeriNo ?? "",
        edevletSifresi: "", // güvenlik: şifre input'a yüklenmez, boşsa korunur
        hisseAdedi: ortak.hisseAdedi?.toString() ?? "",
        hisseOrani: ortak.hisseOrani?.toString() ?? "",
        sermaye: ortak.sermaye?.toString() ?? "",
      });
    } else {
      setForm(BOS);
    }
    setShowSifre(false);
  }, [open, ortak]);

  const set = <K extends keyof typeof BOS>(k: K, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const sayi = (v: string): number | undefined => {
    if (!v.trim()) return undefined;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ad.trim() || !form.soyad.trim()) {
      toast.error("Ad ve soyad zorunludur");
      return;
    }
    if (form.tckn && form.tckn.replace(/\D/g, "").length !== 11) {
      toast.error("TCKN 11 haneli olmalıdır");
      return;
    }
    setLoading(true);
    try {
      // e-Devlet şifresini sunucuda AES-256-GCM ile şifrele (plaintext saklanmaz)
      let edevletSifresi: string | undefined;
      if (form.edevletSifresi.trim()) {
        try {
          const res = await fetch("/api/secrets/encrypt", {
            method: "POST",
            headers: { ...(await authHeaders()), "content-type": "application/json" },
            body: JSON.stringify({ fields: { edevletSifresi: form.edevletSifresi } }),
          });
          if (res.ok) {
            const data = await res.json();
            edevletSifresi = data.encrypted?.edevletSifresi;
          } else {
            toast.warning("Şifre şifrelenemedi", "SECRET_KEY env değişkenini kontrol edin; şifre kaydedilmedi");
          }
        } catch {
          toast.warning("Şifre şifrelenemedi", "Bağlantı hatası; şifre kaydedilmedi");
        }
      }

      const veri = {
        musteriId,
        ofisId: ofisId ?? user?.ofisId ?? "",
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        tckn: form.tckn.replace(/\D/g, "") || undefined,
        dogumTarihi: form.dogumTarihi || undefined,
        kimlikSeriNo: form.kimlikSeriNo.trim() || undefined,
        edevletSifresi, // undefined ise düzenlemede mevcut korunur (merge)
        hisseAdedi: sayi(form.hisseAdedi),
        hisseOrani: sayi(form.hisseOrani),
        sermaye: sayi(form.sermaye),
      };

      if (isFirebaseConfigured) {
        if (ortak) {
          await updateOrtak(ortak.id, veri);
        } else {
          await createOrtak(veri);
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }

      toast.success(isEdit ? "Ortak güncellendi" : "Ortak eklendi", `${form.ad} ${form.soyad}`);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error("Ortak kaydedilemedi", parseFirestoreError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Ortak Düzenle" : "Ortak / Yönetici Ekle"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Ad *" value={form.ad} onChange={(e) => set("ad", e.target.value)} required />
          <Input label="Soyad *" value={form.soyad} onChange={(e) => set("soyad", e.target.value)} required />
          <Input
            label="T.C. Kimlik No"
            value={form.tckn}
            onChange={(e) => set("tckn", e.target.value)}
            maxLength={11}
            placeholder="11 haneli"
          />
          <Input label="Doğum Tarihi" type="date" value={form.dogumTarihi} onChange={(e) => set("dogumTarihi", e.target.value)} />
          <Input label="Kimlik Seri/No" value={form.kimlikSeriNo} onChange={(e) => set("kimlikSeriNo", e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              e-Devlet Şifresi <span className="font-normal text-slate-400 text-xs">(opsiyonel, şifreli saklanır)</span>
            </label>
            <div className="relative">
              <input
                type={showSifre ? "text" : "password"}
                value={form.edevletSifresi}
                onChange={(e) => set("edevletSifresi", e.target.value)}
                placeholder={isEdit ? "Değiştirmek için yazın" : ""}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSifre((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showSifre ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Hisse Adedi" type="number" min="0" value={form.hisseAdedi} onChange={(e) => set("hisseAdedi", e.target.value)} />
          <Input label="Hisse Oranı (%)" type="number" min="0" max="100" step="0.01" value={form.hisseOrani} onChange={(e) => set("hisseOrani", e.target.value)} />
          <Input label="Sermaye (₺)" type="number" min="0" step="0.01" value={form.sermaye} onChange={(e) => set("sermaye", e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
          <Button type="submit" loading={loading}>{isEdit ? "Güncelle" : "Ekle"}</Button>
        </div>
      </form>
    </Modal>
  );
}
