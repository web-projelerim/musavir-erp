"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAppData } from "@/lib/hooks/useAppData";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createNot, deleteNot } from "@/lib/firebase/repositories";
import { getOfisId } from "@/lib/domain/office";
import type { Not, NotRenk } from "@/lib/types";

const RENKLER: { value: NotRenk; bg: string; border: string; dot: string }[] = [
  { value: "sari",  bg: "bg-yellow-50",  border: "border-yellow-300", dot: "bg-yellow-400" },
  { value: "mavi",  bg: "bg-blue-50",    border: "border-blue-300",   dot: "bg-blue-400"   },
  { value: "yesil", bg: "bg-emerald-50", border: "border-emerald-300",dot: "bg-emerald-400"},
  { value: "pembe", bg: "bg-pink-50",    border: "border-pink-300",   dot: "bg-pink-400"   },
];

function renkStyle(renk: NotRenk) {
  return RENKLER.find((r) => r.value === renk) ?? RENKLER[0];
}

function formatSaat(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotesFab() {
  const { user } = useAuth();
  const toast = useToast();
  const { notlar } = useAppData();

  const [panelAcik, setPanelAcik] = useState(false);
  const [yazmaAcik, setYazmaAcik] = useState(false);
  const [icerik, setIcerik] = useState("");
  const [seciliRenk, setSeciliRenk] = useState<NotRenk>("sari");
  const [kayit, setKayit] = useState(false);
  const [localNotlar, setLocalNotlar] = useState<Not[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Firebase'den gelen notları lokal state ile birleştir
  useEffect(() => {
    setLocalNotlar(notlar);
  }, [notlar]);

  useEffect(() => {
    if (yazmaAcik) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setIcerik("");
    }
  }, [yazmaAcik]);

  // Dışarı tıklanınca yazma alanını kapat
  useEffect(() => {
    if (!yazmaAcik) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notes-write]")) {
        setYazmaAcik(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [yazmaAcik]);

  const handleKaydet = async () => {
    if (!icerik.trim()) return;
    setKayit(true);
    try {
      const yeni: Not = {
        id: `not-local-${Date.now()}`,
        ofisId: getOfisId(user?.ofisId),
        icerik: icerik.trim(),
        renk: seciliRenk,
        createdBy: user?.id ?? "demo",
        createdByName: user ? `${user.ad} ${user.soyad}` : "Demo",
        createdAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured) {
        const saved = await createNot({
          ofisId: yeni.ofisId,
          icerik: yeni.icerik,
          renk: yeni.renk,
          createdBy: yeni.createdBy,
          createdByName: yeni.createdByName,
        });
        setLocalNotlar((prev) => [saved, ...prev]);
      } else {
        setLocalNotlar((prev) => [yeni, ...prev]);
      }

      setIcerik("");
      setYazmaAcik(false);
      toast.success("Not kaydedildi");
    } catch {
      toast.error("Not kaydedilemedi");
    } finally {
      setKayit(false);
    }
  };

  const handleSil = async (id: string) => {
    setLocalNotlar((prev) => prev.filter((n) => n.id !== id));
    if (isFirebaseConfigured && !id.startsWith("not-local-")) {
      try {
        await deleteNot(id);
      } catch {
        toast.error("Not silinemedi");
      }
    }
  };

  const sortedNotlar = [...localNotlar].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <>
      {/* Alt panel — tüm notlar */}
      {panelAcik && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-2xl lg:left-60">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-slate-800">Notlar</span>
              {localNotlar.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {localNotlar.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setYazmaAcik(true); setPanelAcik(false); }}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                + Not Ekle
              </button>
              <button
                type="button"
                onClick={() => setPanelAcik(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {sortedNotlar.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Pencil className="mb-2 h-6 w-6 opacity-40" />
                <p className="text-sm">Henuz not yok</p>
                <button
                  type="button"
                  onClick={() => { setYazmaAcik(true); setPanelAcik(false); }}
                  className="mt-2 text-xs text-amber-600 hover:underline"
                >
                  Ilk notu ekle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortedNotlar.map((not) => {
                  const stil = renkStyle(not.renk);
                  return (
                    <div
                      key={not.id}
                      className={cn(
                        "group relative rounded-xl border p-3",
                        stil.bg,
                        stil.border
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSil(not.id)}
                        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-white/70 hover:text-red-500 group-hover:flex transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <p className="pr-6 text-sm text-slate-800 whitespace-pre-wrap break-words">
                        {not.icerik}
                      </p>
                      <p className="mt-2 text-[10px] text-slate-400">
                        {not.createdByName} · {formatSaat(not.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Not yazma popup */}
      {yazmaAcik && (
        <div
          data-notes-write
          className="fixed bottom-20 right-6 z-50 w-72 rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Yeni Not</span>
            <button
              type="button"
              onClick={() => setYazmaAcik(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <textarea
              ref={textareaRef}
              value={icerik}
              onChange={(e) => setIcerik(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) handleKaydet();
              }}
              placeholder="Notunuzu yazin..."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
            />

            {/* Renk seçimi */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Renk:</span>
              {RENKLER.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSeciliRenk(r.value)}
                  className={cn(
                    "h-5 w-5 rounded-full transition-transform",
                    r.dot,
                    seciliRenk === r.value ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-400">Ctrl+Enter ile kaydet</p>
              <button
                type="button"
                onClick={handleKaydet}
                disabled={!icerik.trim() || kayit}
                className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {kayit ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB buton */}
      <button
        type="button"
        onClick={() => {
          if (panelAcik) {
            setPanelAcik(false);
          } else if (yazmaAcik) {
            setYazmaAcik(false);
          } else {
            setYazmaAcik(true);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setPanelAcik((v) => !v);
          setYazmaAcik(false);
        }}
        title="Not ekle (Sag tik: tum notlar)"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg transition-all hover:bg-amber-500 hover:scale-105 active:scale-95"
      >
        <Pencil className="h-5 w-5" />
        {localNotlar.length > 0 && !panelAcik && !yazmaAcik && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {localNotlar.length > 9 ? "9+" : localNotlar.length}
          </span>
        )}
      </button>

      {/* Panel açma butonu — sağ altta panel kapalıyken */}
      {!panelAcik && !yazmaAcik && localNotlar.length > 0 && (
        <button
          type="button"
          onClick={() => setPanelAcik(true)}
          className="fixed bottom-6 right-20 z-50 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-md hover:bg-amber-50 hover:text-amber-700 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          {localNotlar.length} not
        </button>
      )}
    </>
  );
}
