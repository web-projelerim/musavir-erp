"use client";

import { useState } from "react";
import { LucideIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface UcOnayAdim {
  ikon: LucideIcon;
  renk: "blue" | "amber" | "green" | "red";
  baslik: string;
  aciklama: string;
  onayMetni: string;
}

interface UcOnayModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  baslik: string;
  adimlar: [UcOnayAdim, UcOnayAdim, UcOnayAdim];
}

const RENK_MAP: Record<UcOnayAdim["renk"], string> = {
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export function UcOnayModal({ open, onClose, onConfirm, baslik, adimlar }: UcOnayModalProps) {
  const [adim, setAdim] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const mevcutAdim = adimlar[adim];
  const Ikon = mevcutAdim.ikon;

  const handleIleri = async () => {
    if (adim < adimlar.length - 1) {
      setAdim((prev) => prev + 1);
      return;
    }
    setLoading(true);
    try {
      await onConfirm();
      handleKapat();
    } finally {
      setLoading(false);
    }
  };

  const handleKapat = () => {
    setAdim(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <span className="text-sm font-semibold text-slate-900">{baslik}</span>
          <div className="flex gap-1">
            {adimlar.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full transition-colors ${
                  i <= adim ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          <div className={`mb-4 inline-flex rounded-xl p-3 ${RENK_MAP[mevcutAdim.renk]}`}>
            <Ikon className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-slate-900">{mevcutAdim.baslik}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{mevcutAdim.aciklama}</p>
          <p className="mt-3 text-xs text-slate-400">Adım {adim + 1} / {adimlar.length}</p>
        </div>

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
              mevcutAdim.onayMetni
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
