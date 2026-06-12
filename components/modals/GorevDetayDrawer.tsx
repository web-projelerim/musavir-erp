"use client";

import { useEffect, useState } from "react";
import {
  X,
  Calendar,
  User,
  Tag,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Save,
  Trash2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/context/ToastContext";
import type { Gorev, GorevDurum, GorevNot, GorevOncelik, GorevTip } from "@/lib/types";
import { formatTarih, formatSureGecmis } from "@/lib/utils/format";
import { createGorevNot, normalizeGorevNotlar } from "@/lib/utils/gorev";

interface Props {
  gorev: Gorev | null;
  onClose: () => void;
  onDurumGuncelle?: (id: string, durum: GorevDurum) => Promise<void> | void;
  onNotEkle?: (id: string, not: GorevNot) => Promise<void> | void;
  onNotSil?: (id: string, notId: string) => Promise<void> | void;
  onGorevGuncelle?: (id: string, patch: Partial<Gorev>) => Promise<void> | void;
  onGorevSil?: (id: string) => Promise<void> | void;
}

const DURUM_SIRALAMA: GorevDurum[] = ["beklemede", "devam", "tamamlandi"];
const ONCELIKLER: GorevOncelik[] = ["dusuk", "normal", "yuksek", "kritik"];
const TIPLER: GorevTip[] = ["beyanname", "tebligat", "tahsilat", "belge", "kdv2", "diger"];

const ONCELIK_LABEL: Record<GorevOncelik, string> = {
  dusuk: "Düşük",
  normal: "Normal",
  yuksek: "Yüksek",
  kritik: "Kritik",
};

const TIP_LABEL: Record<GorevTip, string> = {
  beyanname: "Beyanname",
  tebligat: "Tebligat",
  tahsilat: "Tahsilat",
  belge: "Belge",
  kdv2: "KDV2",
  diger: "Diğer",
};

export function GorevDetayDrawer({
  gorev,
  onClose,
  onDurumGuncelle,
  onNotEkle,
  onNotSil,
  onGorevGuncelle,
  onGorevSil,
}: Props) {
  const toast = useToast();
  const [not, setNot] = useState("");
  const [notlar, setNotlar] = useState<GorevNot[]>([]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    baslik: "",
    aciklama: "",
    atananKisi: "",
    terminTarihi: "",
    oncelik: "normal" as GorevOncelik,
    tip: "diger" as GorevTip,
  });

  useEffect(() => {
    if (!gorev) return;
    setNot("");
    setNotlar(normalizeGorevNotlar(gorev.notlar));
    setEditForm({
      baslik: gorev.baslik,
      aciklama: gorev.aciklama ?? "",
      atananKisi: gorev.atananKisi,
      terminTarihi: gorev.terminTarihi.slice(0, 10),
      oncelik: gorev.oncelik,
      tip: gorev.tip,
    });
  }, [gorev]);

  if (!gorev) return null;

  const handleDurumDegistir = async (yeniDurum: GorevDurum) => {
    setSaving(true);
    try {
      await onDurumGuncelle?.(gorev.id, yeniDurum);
      toast.success("Durum güncellendi", `Görev durumu "${yeniDurum}" olarak değiştirildi`);
    } catch (error) {
      console.error(error);
      toast.error("Durum kaydedilemedi", parseFirestoreError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleNotEkle = async () => {
    if (!not.trim()) return;
    const yeniNot = createGorevNot(not);
    const eskiNotlar = notlar;

    setNotlar((prev) => [...prev, yeniNot]);
    setNot("");

    try {
      await onNotEkle?.(gorev.id, yeniNot);
      toast.success("Not eklendi");
    } catch (error) {
      console.error(error);
      setNotlar(eskiNotlar);
      toast.error("Not kaydedilemedi", parseFirestoreError(error));
    }
  };

  const handleNotSil = async (notId: string) => {
    const eskiNotlar = notlar;
    setNotlar((prev) => prev.filter((n) => n.id !== notId));
    try {
      await onNotSil?.(gorev.id, notId);
      toast.success("Not silindi");
    } catch (error) {
      console.error(error);
      setNotlar(eskiNotlar);
      toast.error("Not silinemedi", parseFirestoreError(error));
    }
  };

  const handleDuzenlemeKaydet = async () => {
    if (!editForm.baslik.trim()) {
      toast.error("Görev başlığı zorunludur");
      return;
    }

    setSaving(true);
    try {
      await onGorevGuncelle?.(gorev.id, {
        baslik: editForm.baslik.trim(),
        aciklama: editForm.aciklama.trim(),
        atananKisi: editForm.atananKisi.trim(),
        terminTarihi: editForm.terminTarihi,
        oncelik: editForm.oncelik,
        tip: editForm.tip,
      });
      toast.success("Görev güncellendi");
    } catch (error) {
      console.error(error);
      toast.error("Görev kaydedilemedi", parseFirestoreError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSil = async () => {
    if (!window.confirm("Bu görev kalıcı olarak silinsin mi?")) return;

    setSaving(true);
    try {
      await onGorevSil?.(gorev.id);
      toast.success("Görev silindi");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Görev silinemedi", parseFirestoreError(error));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
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
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Durum</p>
            <div className="flex gap-2">
              {DURUM_SIRALAMA.map((d) => (
                <button
                  key={d}
                  disabled={saving}
                  onClick={() => handleDurumDegistir(d)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50",
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

          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detaylar</p>
            {[
              { icon: Building2, label: "Müşteri", value: gorev.musteriAdi },
              { icon: User, label: "Atanan", value: gorev.atananKisi },
              { icon: Calendar, label: "Termin", value: formatTarih(gorev.terminTarihi) },
              { icon: Tag, label: "Tür", value: gorev.tip },
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
                    {ONCELIK_LABEL[gorev.oncelik]}
                  </Badge>
                ),
              },
              { icon: Clock, label: "Oluşturma", value: formatSureGecmis(gorev.createdAt) },
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

          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Düzenle</p>
            <input
              value={editForm.baslik}
              onChange={(e) => setEditForm((prev) => ({ ...prev, baslik: e.target.value }))}
              className={inputClass}
              placeholder="Görev başlığı"
            />
            <textarea
              value={editForm.aciklama}
              onChange={(e) => setEditForm((prev) => ({ ...prev, aciklama: e.target.value }))}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Açıklama"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={editForm.terminTarihi}
                onChange={(e) => setEditForm((prev) => ({ ...prev, terminTarihi: e.target.value }))}
                className={inputClass}
              />
              <input
                value={editForm.atananKisi}
                onChange={(e) => setEditForm((prev) => ({ ...prev, atananKisi: e.target.value }))}
                className={inputClass}
                placeholder="Atanan kişi"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editForm.oncelik}
                onChange={(e) => setEditForm((prev) => ({ ...prev, oncelik: e.target.value as GorevOncelik }))}
                className={inputClass}
              >
                {ONCELIKLER.map((oncelik) => (
                  <option key={oncelik} value={oncelik}>{ONCELIK_LABEL[oncelik]}</option>
                ))}
              </select>
              <select
                value={editForm.tip}
                onChange={(e) => setEditForm((prev) => ({ ...prev, tip: e.target.value as GorevTip }))}
                className={inputClass}
              >
                {TIPLER.map((tip) => (
                  <option key={tip} value={tip}>{TIP_LABEL[tip]}</option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleDuzenlemeKaydet}
              loading={saving}
            >
              Kaydet
            </Button>
          </div>

          {/* Alt görevler / Checklist */}
          {gorev.altGorevler && gorev.altGorevler.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Alt Görevler ({gorev.altGorevler.filter((a) => a.tamamlandi).length}/{gorev.altGorevler.length})
                </p>
                <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(gorev.altGorevler.filter((a) => a.tamamlandi).length / gorev.altGorevler.length) * 100}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-1.5">
                {gorev.altGorevler.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={a.tamamlandi}
                      onChange={() => {
                        if (!onGorevGuncelle) return;
                        const yeni = (gorev.altGorevler ?? []).map((x) =>
                          x.id === a.id
                            ? { ...x, tamamlandi: !x.tamamlandi, tamamlanmaTarihi: !x.tamamlandi ? new Date().toISOString() : undefined }
                            : x
                        );
                        void onGorevGuncelle(gorev.id, { altGorevler: yeni });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className={`flex-1 text-sm ${a.tamamlandi ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {a.baslik}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Notlar ({notlar.length})
            </p>
            {notlar.length > 0 && (
              <div className="space-y-2 mb-3">
                {notlar.map((gorevNotu) => (
                  <div key={gorevNotu.id} className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">{gorevNotu.metin}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {gorevNotu.yazar ? `${gorevNotu.yazar} - ` : ""}
                        {formatSureGecmis(gorevNotu.tarih)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNotSil(gorevNotu.id)}
                      className="flex-shrink-0 p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Notu sil"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
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

        <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap gap-2">
          {gorev.durum !== "tamamlandi" && (
            <Button
              size="sm"
              className="flex-1"
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              onClick={() => handleDurumDegistir("tamamlandi")}
              loading={saving}
            >
              Tamamlandı
            </Button>
          )}
          {gorev.durum !== "iptal" && (
            <Button
              variant="outline"
              size="sm"
              icon={<Ban className="w-3.5 h-3.5" />}
              onClick={() => handleDurumDegistir("iptal")}
              disabled={saving}
            >
              İptal
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleSil}
            disabled={saving}
          >
            Sil
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </>
  );
}
