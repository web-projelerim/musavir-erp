"use client";

import { useState } from "react";
import { Calendar, CheckCircle, Download, FileText, Hash, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge, TebligatBadge } from "@/components/ui/Badge";
import { formatTarih } from "@/lib/utils/format";
import type { Tebligat } from "@/lib/types";

interface Props {
  tebligat: Tebligat | null;
  onClose: () => void;
  onPdf: (tebligat: Tebligat) => void;
  onIslendi: (id: string) => Promise<void> | void;
}

export function TebligatDetayModal({ tebligat, onClose, onPdf, onIslendi }: Props) {
  const [loading, setLoading] = useState(false);

  if (!tebligat) return null;

  const handleIslendi = async () => {
    setLoading(true);
    try {
      await onIslendi(tebligat.id);
    } finally {
      setLoading(false);
    }
  };

  const detaylar = [
    { icon: User, label: "Musteri", value: tebligat.musteriAdi },
    { icon: Hash, label: "VKN/TCKN", value: tebligat.vknTckn },
    { icon: Calendar, label: "Tarih", value: formatTarih(tebligat.tarih) },
    { icon: FileText, label: "Tur", value: tebligat.tur },
  ];

  return (
    <Modal open={Boolean(tebligat)} onClose={onClose} title="Tebligat Detayi" size="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-blue-600 font-medium mb-1">{tebligat.musteriAdi}</p>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{tebligat.baslik}</h3>
          </div>
          <TebligatBadge durum={tebligat.durum} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {detaylar.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Durum ve Not</p>
            <Badge variant="neutral">{tebligat.id}</Badge>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {tebligat.notlar || "Bu tebligat icin ek not bulunmuyor."}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => onPdf(tebligat)}
          >
            PDF Goruntule
          </Button>
          {tebligat.durum !== "islendi" && (
            <Button
              type="button"
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              onClick={handleIslendi}
              loading={loading}
            >
              Islendi Isaretle
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
