"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Şifre değiştirme modalı — mükellef paneli (ve gerektiğinde diğer ekranlar) için.
 * Ayarlar sayfasındaki akışla aynı güvenlik mantığı: mevcut şifreyle reauth,
 * Firebase hata kodu eşleme, audit log.
 */
export function SifreDegistirModal({ open, onClose }: Props) {
  const { user, changePassword } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  const [mevcutSifre, setMevcutSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setMevcutSifre("");
    setYeniSifre("");
    setYeniSifreTekrar("");
    setHata(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHata(null);

    if (!mevcutSifre) {
      setHata("Mevcut şifrenizi girin.");
      return;
    }
    if (yeniSifre.length < 6) {
      setHata("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setHata("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (yeniSifre === mevcutSifre) {
      setHata("Yeni şifre mevcut şifreden farklı olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(mevcutSifre, yeniSifre);
      toast.success("Şifre değiştirildi", "Yeni şifrenizle giriş yapabilirsiniz.");
      logAudit({
        action: "update",
        entityType: "sistem",
        entityId: user?.id ?? "",
        entityLabel: user?.email,
        summary: "Şifre değiştirildi",
      }).catch((e) => console.warn("[Audit] Şifre log hatası:", e));
      resetAndClose();
    } catch (err) {
      const kod = err instanceof FirebaseError ? err.code : "";
      if (kod === "auth/wrong-password" || kod === "auth/invalid-credential") {
        setHata("Mevcut şifreniz hatalı.");
      } else if (kod === "auth/too-many-requests") {
        setHata("Çok fazla başarısız deneme. Lütfen bir süre bekleyin.");
      } else if (kod === "auth/requires-recent-login") {
        setHata("Güvenlik nedeniyle oturumu kapatıp tekrar giriş yapın, ardından tekrar deneyin.");
      } else {
        setHata(err instanceof Error ? err.message : "Bilinmeyen hata");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Şifre Değiştir">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Mevcut Şifre"
          type="password"
          value={mevcutSifre}
          onChange={(e) => setMevcutSifre(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Input
          label="Yeni Şifre"
          type="password"
          value={yeniSifre}
          onChange={(e) => setYeniSifre(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label="Yeni Şifre (Tekrar)"
          type="password"
          value={yeniSifreTekrar}
          onChange={(e) => setYeniSifreTekrar(e.target.value)}
          autoComplete="new-password"
          required
        />
        {hata && (
          <p className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700">{hata}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Vazgeç
          </Button>
          <Button type="submit" loading={loading}>
            Şifreyi Değiştir
          </Button>
        </div>
      </form>
    </Modal>
  );
}
