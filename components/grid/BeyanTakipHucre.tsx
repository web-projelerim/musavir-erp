"use client";

import { useState, useRef, useEffect } from "react";
import type { BeyanTakipDurum, BeyanTakipHucresi } from "@/lib/types";
import { takipDurumRenk, TAKIP_DURUM_SECENEKLER } from "@/lib/domain/beyanTakip";
import { cn } from "@/lib/utils/cn";
import { Check, AlertTriangle, FileText, Receipt, ChevronDown } from "lucide-react";

interface Props {
  hucre: BeyanTakipHucresi | undefined;
  mukellef: boolean;
  readOnly?: boolean;
  onDurumDegistir: (durum: BeyanTakipDurum) => void;
}

export function BeyanTakipHucre({ hucre, mukellef, readOnly, onDurumDegistir }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (!mukellef) {
    return (
      <td className="px-2 py-2 text-center border-b border-slate-100">
        <span className="text-slate-300 text-xs">—</span>
      </td>
    );
  }

  const durum: BeyanTakipDurum = hucre?.durum ?? "bos";
  const verildi = durum === "tamamlandi" || durum === "gonderildi";
  const sorunVar = durum === "sorun";

  function handleToggle() {
    if (readOnly) return;
    if (verildi) {
      onDurumDegistir("bos");
    } else {
      onDurumDegistir("tamamlandi");
    }
  }

  return (
    <td className="px-1 py-1.5 text-center relative border-b border-slate-100" ref={ref}>
      <div className="flex items-center justify-center gap-0.5">
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all",
            verildi && "bg-emerald-500 border-emerald-500 text-white",
            sorunVar && "bg-red-100 border-red-400 text-red-600",
            !verildi && !sorunVar && "bg-white border-slate-300 hover:border-blue-400",
            readOnly && "cursor-default opacity-70",
            !readOnly && "cursor-pointer"
          )}
          title={verildi ? "Verildi — geri almak için tıklayın" : sorunVar ? "Sorun var" : "Verilmedi — işaretlemek için tıklayın"}
        >
          {verildi && <Check className="w-4 h-4" strokeWidth={3} />}
          {sorunVar && <AlertTriangle className="w-3.5 h-3.5" />}
        </button>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className="w-4 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded transition-colors"
            title="Detaylı durum seç"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 p-2 min-w-[180px]">
          <p className="text-xs font-semibold text-slate-600 px-2 py-1 mb-1">Durum Seç</p>
          {TAKIP_DURUM_SECENEKLER.map((s) => {
            const r = takipDurumRenk(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => { onDurumDegistir(s.value); setMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors",
                  durum === s.value ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"
                )}
              >
                <span className={cn("w-3 h-3 rounded-sm border", r.bg, r.border)} />
                {s.label}
              </button>
            );
          })}

          {hucre?.durum === "tamamlandi" && (hucre.pdfUrl || hucre.tahakkukFisUrl) && (
            <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
              {hucre.pdfUrl && (
                <a
                  href={hucre.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <FileText className="w-3 h-3" /> Beyanname PDF
                </a>
              )}
              {hucre.tahakkukFisUrl && (
                <a
                  href={hucre.tahakkukFisUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Receipt className="w-3 h-3" /> Tahakkuk Fişi
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </td>
  );
}
