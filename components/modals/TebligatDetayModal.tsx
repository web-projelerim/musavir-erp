"use client";

import { useState } from "react";
import { Calendar, CheckCircle, Download, FileText, Hash, PlayCircle, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge, TebligatAksiyonBadge, TebligatBadge } from "@/components/ui/Badge";
import {
  tebligatAksiyonDurumLabel,
  tebligatAksiyonLabel,
  tebligatKalanGun,
  tebligatSlaLabel,
  tebligatSlaVariant,
} from "@/lib/domain/tebligatSla";
import type { Tebligat } from "@/lib/types";
import { formatTarih } from "@/lib/utils/format";

interface Props {
  tebligat: Tebligat | null;
  onClose: () => void;
  onPdf: (tebligat: Tebligat) => void;
  onIslendi: (id: string) => Promise<void> | void;
  onAksiyon: (id: string) => Promise<void> | void;
}

export function TebligatDetayModal({ tebligat, onClose, onPdf, onIslendi, onAksiyon }: Props) {
  const [loading, setLoading] = useState(false);
  const [aksiyonLoading, setAksiyonLoading] = useState(false);

  if (!tebligat) return null;

  const handleIslendi = async () => {
    setLoading(true);
    try {
      await onIslendi(tebligat.id);
    } finally {
      setLoading(false);
    }
  };

  const handleAksiyon = async () => {
    setAksiyonLoading(true);
    try {
      await onAksiyon(tebligat.id);
    } finally {
      setAksiyonLoading(false);
    }
  };

  const kalanGun = tebligatKalanGun(tebligat);
  const detaylar = [
    { icon: User, label: "Müşteri", value: tebligat.musteriAdi },
    { icon: Hash, label: "VKN/TCKN", value: tebligat.vknTckn },
    { icon: Calendar, label: "Tebligat Tarihi", value: formatTarih(tebligat.tarih) },
    { icon: FileText, label: "Tür", value: tebligat.tur },
    {
      icon: Calendar,
      label: "Ulaşma Tarihi",
      value: tebligat.ulasmaTarihi ? formatTarih(tebligat.ulasmaTarihi) : "-",
    },
    {
      icon: Calendar,
      label: "Tebliğ Edilmiş Sayılma",
      value: tebligat.tebligEdilmisSayilmaTarihi ? formatTarih(tebligat.tebligEdilmisSayilmaTarihi) : "-",
    },
    {
      icon: Calendar,
      label: "Kritik Son Tarih",
      value: tebligat.kritikSonTarih ? formatTarih(tebligat.kritikSonTarih) : "-",
    },
    {
      icon: User,
      label: "Aksiyon Sahibi",
      value: tebligat.aksiyonSahibi ?? "-",
    },
  ];

  return (
    <Modal open={Boolean(tebligat)} onClose={onClose} title="Tebligat Detayı" size="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-blue-600">{tebligat.musteriAdi}</p>
            <h3 className="text-lg font-bold leading-snug text-slate-900">{tebligat.baslik}</h3>
          </div>
          <TebligatBadge durum={tebligat.durum} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {detaylar.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SLA</p>
            <div className="mt-2">
              <Badge variant={tebligatSlaVariant(kalanGun, tebligat.aksiyonDurumu)}>
                {tebligatSlaLabel(kalanGun, tebligat.aksiyonDurumu)}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aksiyon Tipi</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{tebligatAksiyonLabel(tebligat.aksiyonTipi)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aksiyon Durumu</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {tebligat.aksiyonDurumu ? (
                <TebligatAksiyonBadge durum={tebligat.aksiyonDurumu} />
              ) : (
                <Badge variant="neutral">Tanımsız</Badge>
              )}
              <span className="text-xs text-slate-500">{tebligatAksiyonDurumLabel(tebligat.aksiyonDurumu)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Durum ve Not</p>
            <Badge variant="neutral">{tebligat.id}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {tebligat.notlar || "Bu tebligat için ek not bulunmuyor."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          {tebligat.aksiyonDurumu !== "tamamlandi" && (
            <Button
              type="button"
              variant="outline"
              icon={<PlayCircle className="h-3.5 w-3.5" />}
              onClick={handleAksiyon}
              loading={aksiyonLoading}
            >
              {tebligat.aksiyonDurumu === "bekliyor" ? "İşleme Al" : "Aksiyonu Tamamla"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => onPdf(tebligat)}
          >
            PDF Görüntüle
          </Button>
          {tebligat.durum !== "islendi" && (
            <Button
              type="button"
              icon={<CheckCircle className="h-3.5 w-3.5" />}
              onClick={handleIslendi}
              loading={loading}
            >
              İşlendi İşaretle
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
