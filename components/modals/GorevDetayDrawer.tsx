"use client";

import { useState } from "react";
import { X, Calendar, User, Tag, Building2, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge, GorevDurumBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/context/ToastContext";
import type { Gorev, GorevDurum } from "@/lib/types";
import { formatTarih, formatSureGecmis } from "@/lib/utils/format";

interface Props {
  gorev: Gorev | null;
  onClose: () => void;
  onDurumGuncelle?: (id: string, durum: GorevDurum) => void;
}

const DURUM_SIRALAMA: GorevDurum[] = ["beklemede", "devam", "tamamlandi"];

export function GorevDetayDrawer({ gorev, onClose, onDurumGuncelle }: Props) {
  const toast = useToast();
  const [not, setNot] = useState("");
  const [notlar, setNotlar] = useState<{ metin: string; tarih: string }[]>([]);

  if (!gorev) return null;

  const handleDurumDegistir = (yeniDurum: GorevDurum) => {
    onDurumGuncelle?.(gorev.id, yeniDurum);
    toast.success("Durum güncellendi", `Görev durumu "${yeniDurum}" olarak değiştirildi`);
  };

  const handleNotEkle = () => {
    if (!not.trim()) return;
    setNotlar((prev) => [...prev, { metin: not, tarih: new Date().toISOString() }]);
    setNot("");
    toast.success("Not eklendi");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-screen w-96 bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Başlık */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-xs text-blue-600 font-medium mb-1">{gorev.musteriAdi}</p>
            <h3 className="text-sm font-bold text-slate-800 leading-snug">{gorev.baslik}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Durum değiştirici */}
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Durum</p>
            <div className="flex gap-2">
              {DURUM_SIRALAMA.map((d) => (
                <button
                  key={d}
                  onClick={() => handleDurumDegistir(d)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                    gorev.durum === d
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {d === "beklemede" ? "Beklemede" : d === "devam" ? "Devam" : "Tamamlandı"}
                </button>
              ))}
            </div>
          </div>

          {/* Detaylar */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detaylar</p>
            {[
              {
                icon: Building2,
                label: "Müşteri",
                value: gorev.musteriAdi,
              },
              {
                icon: User,
                label: "Atanan",
                value: gorev.atananKisi,
              },
              {
                icon: Calendar,
                label: "Termin",
                value: formatTarih(gorev.terminTarihi),
              },
              {
                icon: Tag,
                label: "Tür",
                value: gorev.tip,
              },
              {
                icon: AlertCircle,
                label: "Öncelik",
                value: (
                  <Badge
                    variant={
                      gorev.oncelik === "kritik" ? "danger" :
                      gorev.oncelik === "yuksek" ? "warning" : "neutral"
                    }
                  >
                    {gorev.oncelik}
                  </Badge>
                ),
              },
              {
                icon: Clock,
                label: "Oluşturulma",
                value: formatSureGecmis(gorev.createdAt),
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">{label}</span>
                {typeof value === "string" ? (
                  <span className="text-xs font-medium text-slate-700">{value}</span>
                ) : (
                  value
                )}
              </div>
            ))}
          </div>

          {/* Açıklama */}
          {gorev.aciklama && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Açıklama</p>
              <p className="text-sm text-slate-600">{gorev.aciklama}</p>
            </div>
          )}

          {/* Notlar */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Notlar ({notlar.length})
            </p>
            {notlar.length > 0 && (
              <div className="space-y-2 mb-3">
                {notlar.map((n, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    <p className="text-xs text-slate-700">{n.metin}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatSureGecmis(n.tarih)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={not}
                onChange={(e) => setNot(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNotEkle()}
                placeholder="Not ekle... (Enter)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button size="sm" onClick={handleNotEkle} disabled={!not.trim()}>
                Ekle
              </Button>
            </div>
          </div>
        </div>

        {/* Alt aksiyonlar */}
        <div className="px-5 py-3 border-t border-slate-200 flex gap-2">
          {gorev.durum !== "tamamlandi" && (
            <Button
              size="sm"
              className="flex-1"
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              onClick={() => {
                handleDurumDegistir("tamamlandi");
                onClose();
              }}
            >
              Tamamlandı İşaretle
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </>
  );
}
