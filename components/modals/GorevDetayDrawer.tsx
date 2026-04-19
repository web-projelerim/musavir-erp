"use client";

import { useState, useEffect } from "react";
import { X, Calendar, User, Tag, Building2, AlertCircle, Clock, CheckCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/context/ToastContext";
import { gorevDurumGuncelle } from "@/lib/services/gorev.service";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import type { Gorev, GorevDurum } from "@/lib/types";
import { formatTarih, formatSureGecmis } from "@/lib/utils/format";

interface Props {
  gorev: Gorev | null;
  onClose: () => void;
  onDurumGuncelle?: (id: string, durum: GorevDurum) => void;
}

const DURUMLAR: { key: GorevDurum; label: string }[] = [
  { key: "beklemede",  label: "Beklemede" },
  { key: "devam",      label: "Devam"     },
  { key: "tamamlandi", label: "Tamamlandı" },
];

export function GorevDetayDrawer({ gorev, onClose, onDurumGuncelle }: Props) {
  const toast = useToast();
  const [currentDurum, setCurrentDurum] = useState<GorevDurum>(gorev?.durum ?? "beklemede");
  const [not, setNot] = useState("");
  const [notlar, setNotlar] = useState<{ metin: string; tarih: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gorev) setCurrentDurum(gorev.durum);
  }, [gorev?.id]);

  if (!gorev) return null;

  const handleDurumDegistir = async (yeniDurum: GorevDurum) => {
    setSaving(true);
    try {
      if (FB_CONFIGURED) {
        await gorevDurumGuncelle(gorev.id, yeniDurum);
      }
      setCurrentDurum(yeniDurum);
      onDurumGuncelle?.(gorev.id, yeniDurum);
      toast.success("Durum güncellendi");
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const handleNotEkle = () => {
    if (!not.trim()) return;
    setNotlar((p) => [...p, { metin: not.trim(), tarih: new Date().toISOString() }]);
    setNot("");
    toast.success("Not eklendi");
  };

  const handleTamamla = async () => {
    await handleDurumDegistir("tamamlandi");
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgb(0 0 0 / 0.2)" }}
        onClick={onClose} />

      <div className="fixed top-0 right-0 h-screen z-50 flex flex-col bg-white animate-slide-right"
        style={{ width: 384, boxShadow: "-4px 0 24px rgb(0 0 0 / .08)", borderLeft: "1px solid #e5e7eb" }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div className="flex-1 min-w-0 mr-3">
            <p style={{ fontSize: 11, color: "#2563eb", fontWeight: 500, marginBottom: 3 }}>
              {gorev.musteriAdi || "Genel görev"}
            </p>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
              {gorev.baslik}
            </h3>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center rounded hover:bg-gray-100 transition-colors flex-shrink-0"
            style={{ width: 28, height: 28, color: "#9ca3af" }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Durum */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 8 }}>
              Durum
            </p>
            <div className="flex gap-2">
              {DURUMLAR.map((d) => (
                <button key={d.key} onClick={() => handleDurumDegistir(d.key)}
                  disabled={saving}
                  className="flex-1 py-1.5 rounded transition-colors text-center"
                  style={{
                    fontSize: 11, fontWeight: 500,
                    border: `1px solid ${currentDurum === d.key ? "#2563eb" : "#e5e7eb"}`,
                    background: currentDurum === d.key ? "#2563eb" : "#fff",
                    color: currentDurum === d.key ? "#fff" : "#6b7280",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detaylar */}
          <div className="px-5 py-4 space-y-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase",
              letterSpacing: "0.06em" }}>
              Detaylar
            </p>
            {[
              { icon: Building2, label: "Müşteri",  value: gorev.musteriAdi },
              { icon: User,      label: "Atanan",   value: gorev.atananKisi },
              { icon: Calendar,  label: "Termin",   value: formatTarih(gorev.terminTarihi) },
              { icon: Tag,       label: "Tür",      value: gorev.tip },
              { icon: Clock,     label: "Oluşturma", value: formatSureGecmis(gorev.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon style={{ width: 13, height: 13, color: "#d1d5db", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#9ca3af", width: 72, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <AlertCircle style={{ width: 13, height: 13, color: "#d1d5db", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#9ca3af", width: 72, flexShrink: 0 }}>Öncelik</span>
              <Badge variant={gorev.oncelik === "kritik" ? "danger" : gorev.oncelik === "yuksek" ? "warning" : "neutral"}>
                {gorev.oncelik}
              </Badge>
            </div>
          </div>

          {/* Açıklama */}
          {gorev.aciklama && (
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase",
                letterSpacing: "0.06em", marginBottom: 6 }}>
                Açıklama
              </p>
              <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{gorev.aciklama}</p>
            </div>
          )}

          {/* Notlar */}
          <div className="px-5 py-4">
            <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 10 }}>
              Notlar ({notlar.length})
            </p>
            <div className="space-y-2 mb-3">
              {notlar.map((n, i) => (
                <div key={i} className="rounded px-3 py-2"
                  style={{ background: "#fefce8", border: "1px solid #fde047" }}>
                  <p style={{ fontSize: 12, color: "#374151" }}>{n.metin}</p>
                  <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{formatSureGecmis(n.tarih)}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={not} onChange={(e) => setNot(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNotEkle()}
                placeholder="Not ekle... (Enter)"
                style={{ flex: 1, padding: "7px 10px", fontSize: 12, color: "#374151",
                  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none" }} />
              <Button size="sm" variant="outline" onClick={handleNotEkle}
                disabled={!not.trim()}>
                Ekle
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex gap-2" style={{ borderTop: "1px solid #e5e7eb" }}>
          {currentDurum !== "tamamlandi" && (
            <Button size="sm" className="flex-1" loading={saving}
              icon={<CheckCircle style={{ width: 12, height: 12 }} />}
              onClick={handleTamamla}>
              Tamamlandı İşaretle
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </>
  );
}
