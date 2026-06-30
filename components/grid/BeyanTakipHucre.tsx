"use client";

import { useState, useRef, useEffect } from "react";
import type { BeyanTakipDurum, BeyanTakipHucresi } from "@/lib/types";
import { takipDurumRenk, TAKIP_DURUM_SECENEKLER } from "@/lib/domain/beyanTakip";
import { cn } from "@/lib/utils/cn";
import { FileText, Receipt } from "lucide-react";

interface Props {
  hucre: BeyanTakipHucresi | undefined;
  mukellef: boolean;
  readOnly?: boolean;
  onDurumDegistir: (durum: BeyanTakipDurum) => void;
}

export function BeyanTakipHucre({ hucre, mukellef, readOnly, onDurumDegistir }: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen]);

  if (!mukellef) {
    return <td className="px-1 py-1 text-center"><span className="text-slate-200">—</span></td>;
  }

  const durum: BeyanTakipDurum = hucre?.durum ?? "bos";
  const renk = takipDurumRenk(durum);

  return (
    <td className="px-1 py-1 text-center relative" ref={ref}>
      <button
        type="button"
        onClick={() => !readOnly && setPopoverOpen((p) => !p)}
        className={cn(
          "w-8 h-8 rounded-lg border transition-colors",
          renk.bg,
          renk.border,
          !readOnly && "hover:ring-2 hover:ring-blue-300 cursor-pointer",
          readOnly && "cursor-default"
        )}
        title={renk.label}
      />

      {popoverOpen && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 p-2 min-w-[180px]">
          <p className="text-xs font-semibold text-slate-600 px-2 py-1 mb-1">Durum Seç</p>
          {TAKIP_DURUM_SECENEKLER.map((s) => {
            const r = takipDurumRenk(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => { onDurumDegistir(s.value); setPopoverOpen(false); }}
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
