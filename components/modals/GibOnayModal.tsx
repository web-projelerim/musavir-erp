"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface GibOnayModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  baslik: string;
  syncTipi: string;
  musteriSayisi: number;
}

const ADIMLAR = [
  {
    ikon: Shield,
    renk: "blue",
    baslik: "GİB sistemine bağlanmak üzeresiniz",
    aciklama: (syncTipi: string, _musteriSayisi: number) =>
      `Bu işlem GİB İnteraktif Vergi Dairesi (IVD) sistemine gerçek bir bağlantı açacak ve "${syncTipi}" verilerini çekecektir. Kaydedilmiş IVD kimlik bilgileriniz kullanılacaktır.`,
    onay: "Anladım, devam et",
  },
  {
    ikon: AlertTriangle,
    renk: "amber",
    baslik: "Mevcut kayıtlar güncellenecek",
    aciklama: (_syncTipi: string, musteriSayisi: number) =>
      `GİB'den gelen veriler Firestore'daki mevcut kayıtların üzerine yazılacaktır (upsert). ${musteriSayisi > 0 ? `${musteriSayisi} aktif müşteri` : "Ofis VKN/TCKN"} için veri çekilecek. Bu işlem geri alınamaz.`,
    onay: "Riskleri anladım, onayla",
  },
  {
    ikon: CheckCircle2,
    renk: "green",
    baslik: "Son onay",
    aciklama: (syncTipi: string, musteriSayisi: number) =>
      `"${syncTipi}" senkronizasyonunu ${musteriSayisi > 0 ? `${musteriSayisi} müşteri` : "ofis hesabı"} için başlatmak istediğinizi kesinleştirin. İşlem birkaç saniye sürebilir.`,
    onay: "Evet, başlat",
  },
];

export function GibOnayModal({ open, onClose, onConfirm, baslik, syncTipi, musteriSayisi }: GibOnayModalProps) {
  const [adim, setAdim] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const mevcutAdim = ADIMLAR[adim];
  const Ikon = mevcutAdim.ikon;

  const ikonRenk = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  }[mevcutAdim.renk];

  const handleIleri = async () => {
    if (adim < ADIMLAR.length - 1) {
      setAdim((prev) => prev + 1);
    } else {
      setLoading(true);
      try {
        await onConfirm();
        handleKapat();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKapat = () => {
    setAdim(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <span className="text-sm font-semibold text-slate-900">{baslik}</span>
          <div className="flex gap-1">
            {ADIMLAR.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full transition-colors ${
                  i <= adim ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className={`mb-4 inline-flex rounded-xl p-3 ${ikonRenk}`}>
            <Ikon className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-slate-900">
            {mevcutAdim.baslik}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {adim === 0
              ? ADIMLAR[0].aciklama(syncTipi, musteriSayisi)
              : adim === 1
              ? ADIMLAR[1].aciklama(syncTipi, musteriSayisi)
              : ADIMLAR[2].aciklama(syncTipi, musteriSayisi)}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Adım {adim + 1} / {ADIMLAR.length}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <Button variant="ghost" onClick={handleKapat} disabled={loading}>
            İptal
          </Button>
          <Button onClick={handleIleri} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                İşleniyor...
              </span>
            ) : (
              mevcutAdim.onay
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
