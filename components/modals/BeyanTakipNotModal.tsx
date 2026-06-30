"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { BeyanTakipNotu, BeyanTakipNotTur } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Pin, Clock, Trash2, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  musteriAdi: string;
  donem: string;
  notlar: BeyanTakipNotu[];
  kaliciNotlar: BeyanTakipNotu[];
  readOnly?: boolean;
  onNotEkle: (icerik: string, tur: BeyanTakipNotTur) => void;
  onNotSil: (id: string) => void;
}

export function BeyanTakipNotModal({
  open,
  onClose,
  musteriAdi,
  donem,
  notlar,
  kaliciNotlar,
  readOnly,
  onNotEkle,
  onNotSil,
}: Props) {
  const [yeniNot, setYeniNot] = useState("");
  const [yeniNotTur, setYeniNotTur] = useState<BeyanTakipNotTur>("gecici");

  function handleEkle() {
    const trimmed = yeniNot.trim();
    if (!trimmed) return;
    onNotEkle(trimmed, yeniNotTur);
    setYeniNot("");
  }

  const tumNotlar = [
    ...kaliciNotlar.map((n) => ({ ...n, _kaynakTur: "kalici" as const })),
    ...notlar.map((n) => ({ ...n, _kaynakTur: n.tur })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Modal open={open} onClose={onClose} title={`${musteriAdi} — Notlar`} size="md">
      <p className="text-xs text-slate-500 mb-4">{donem} dönemi</p>

      {!readOnly && (
        <div className="mb-4 space-y-2">
          <textarea
            value={yeniNot}
            onChange={(e) => setYeniNot(e.target.value)}
            placeholder="Not ekle..."
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setYeniNotTur("gecici")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  yeniNotTur === "gecici"
                    ? "bg-amber-100 border-amber-300 text-amber-800"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                <Clock className="w-3 h-3" /> Geçici
              </button>
              <button
                type="button"
                onClick={() => setYeniNotTur("kalici")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                  yeniNotTur === "kalici"
                    ? "bg-blue-100 border-blue-300 text-blue-800"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                <Pin className="w-3 h-3" /> Kalıcı
              </button>
            </div>
            <Button
              size="sm"
              icon={<Plus className="w-3 h-3" />}
              onClick={handleEkle}
              disabled={!yeniNot.trim()}
            >
              Ekle
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {tumNotlar.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Henüz not eklenmemiş</p>
        )}
        {tumNotlar.map((n) => (
          <div
            key={n.id}
            className={cn(
              "rounded-lg border p-3",
              n._kaynakTur === "kalici"
                ? "bg-blue-50 border-blue-200"
                : "bg-amber-50 border-amber-200"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  {n._kaynakTur === "kalici" ? (
                    <Pin className="w-3 h-3 text-blue-500" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-500" />
                  )}
                  <span className="text-[10px] font-medium text-slate-500">
                    {n._kaynakTur === "kalici" ? "Kalıcı" : "Geçici"} — {n.createdByName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{n.icerik}</p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onNotSil(n.id)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
