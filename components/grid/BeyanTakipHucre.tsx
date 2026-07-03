"use client";

import { useState, useRef, useEffect } from "react";
import type { BeyanTakipDurum, BeyanTakipHucresi } from "@/lib/types";
import { takipDurumRenk, takipDurumLabel, TAKIP_DURUM_SECENEKLER } from "@/lib/domain/beyanTakip";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, FileText, Receipt, MoreHorizontal } from "lucide-react";

interface Props {
  hucre: BeyanTakipHucresi | undefined;
  mukellef: boolean;
  readOnly?: boolean;
  /** Beyan (B) durumunu değiştirir — mevcut durum alanına yazar. */
  onDurumDegistir: (durum: BeyanTakipDurum) => void;
  /** Tahakkuk (T) işaretini değiştirir — bağımsız alana yazar. */
  onTahakkukDegistir: (yapildi: boolean) => void;
}

/** Hücre içindeki B/T çipi. */
function Cip({
  harf,
  aktif,
  title,
  onClick,
  readOnly,
}: {
  harf: string;
  aktif: boolean;
  title: string;
  onClick: () => void;
  readOnly?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) onClick();
      }}
      disabled={readOnly}
      className={cn(
        "w-5 h-6 rounded flex items-center justify-center text-[11px] font-bold leading-none transition-all",
        aktif
          ? "bg-white text-emerald-700 shadow-sm"
          : "bg-white/20 text-white/90 border border-white/50",
        !readOnly && "hover:scale-110 cursor-pointer",
        readOnly && "cursor-default"
      )}
    >
      {harf}
    </button>
  );
}

export function BeyanTakipHucre({ hucre, mukellef, readOnly, onDurumDegistir, onTahakkukDegistir }: Props) {
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

  // Sorumlu değil → gri boş hücre
  if (!mukellef) {
    return (
      <td className="p-1 border-b border-r border-slate-100">
        <div className="h-9 rounded-md bg-slate-100/70" />
      </td>
    );
  }

  const durum: BeyanTakipDurum = hucre?.durum ?? "bos";
  const beyan = durum === "tamamlandi" || durum === "gonderildi";
  const sorun = durum === "sorun";
  const ara = durum !== "bos" && !beyan && !sorun; // evrak_bekleniyor / hazirlaniyor / kontrol
  const tahakkuk = hucre?.tahakkukYapildi === true;

  const cellTone = beyan
    ? "bg-emerald-600"
    : sorun
    ? "bg-red-600"
    : ara
    ? "bg-amber-400"
    : "bg-red-400"; // beyan edilmemiş

  function toggleBeyan() {
    if (readOnly) return;
    onDurumDegistir(beyan ? "bos" : "tamamlandi");
  }
  function toggleTahakkuk() {
    if (readOnly) return;
    onTahakkukDegistir(!tahakkuk);
  }

  const guncelParts: string[] = [];
  if (hucre?.guncelleyenAd) guncelParts.push(hucre.guncelleyenAd);
  if (hucre?.guncellenmeTarihi) {
    guncelParts.push(
      new Date(hucre.guncellenmeTarihi).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
  const guncelTitle = guncelParts.join(" · ");

  return (
    <td
      className="p-1 border-b border-r border-slate-100 relative group"
      ref={ref}
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setMenuOpen(true);
      }}
    >
      <div
        className={cn(
          "relative h-9 rounded-md flex items-center justify-center gap-1 transition-colors",
          cellTone,
          readOnly && "opacity-80"
        )}
      >
        {beyan ? (
          <>
            <Cip
              harf="B"
              aktif
              title={guncelTitle ? `Beyanname verildi (${guncelTitle}) — geri almak için tıklayın` : "Beyanname verildi — geri almak için tıklayın"}
              onClick={toggleBeyan}
              readOnly={readOnly}
            />
            <Cip
              harf="T"
              aktif={tahakkuk}
              title={tahakkuk ? "Tahakkuk yapıldı — geri almak için tıklayın" : "Tahakkuk bekliyor — işaretlemek için tıklayın"}
              onClick={toggleTahakkuk}
              readOnly={readOnly}
            />
          </>
        ) : sorun ? (
          <button
            type="button"
            onClick={() => !readOnly && setMenuOpen(true)}
            className="flex items-center gap-1 px-1 text-white text-[11px] font-semibold"
            title="Sorun — detay için tıklayın"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Sorun
          </button>
        ) : ara ? (
          <button
            type="button"
            onClick={toggleBeyan}
            disabled={readOnly}
            className="px-1 text-white text-[10px] font-bold uppercase tracking-wide"
            title={`${takipDurumLabel(durum)} — beyanı işaretlemek için tıklayın`}
          >
            {takipDurumLabel(durum).slice(0, 6)}
          </button>
        ) : (
          // Beyan edilmemiş (kırmızı) — tıklayınca beyan işaretlenir
          <button
            type="button"
            onClick={toggleBeyan}
            disabled={readOnly}
            className="w-full h-full flex items-center justify-center rounded-md"
            title="Beyan edilmedi — işaretlemek için tıklayın"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold">
              İşaretle
            </span>
          </button>
        )}

        {/* Detay çağırıcı (hover) */}
        {!readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((p) => !p);
            }}
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 items-center justify-center rounded-full bg-white shadow border border-slate-200 text-slate-500 hover:text-slate-700"
            title="Detay / durum seç"
          >
            <MoreHorizontal className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 p-2 min-w-[190px] text-left">
          <p className="text-xs font-semibold text-slate-600 px-2 py-1 mb-1">Durum Seç</p>
          {TAKIP_DURUM_SECENEKLER.map((s) => {
            const r = takipDurumRenk(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  onDurumDegistir(s.value);
                  setMenuOpen(false);
                }}
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

          <div className="border-t border-slate-100 mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onTahakkukDegistir(!tahakkuk);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-slate-50 transition-colors"
            >
              <span
                className={cn(
                  "w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] font-bold",
                  tahakkuk ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300 text-transparent"
                )}
              >
                T
              </span>
              Tahakkuk {tahakkuk ? "yapıldı ✓" : "bekliyor"}
            </button>
          </div>

          {guncelTitle && (
            <div className="border-t border-slate-100 mt-2 pt-2 px-2">
              <p className="text-[10px] text-slate-400">
                Son güncelleyen: <span className="text-slate-600 font-medium">{hucre?.guncelleyenAd}</span>
              </p>
              {hucre?.guncellenmeTarihi && (
                <p className="text-[10px] text-slate-400">
                  {new Date(hucre.guncellenmeTarihi).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          )}

          {(hucre?.pdfUrl || hucre?.tahakkukFisUrl) && (
            <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
              {hucre?.pdfUrl && (
                <a
                  href={hucre.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <FileText className="w-3 h-3" /> Beyanname PDF
                </a>
              )}
              {hucre?.tahakkukFisUrl && (
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
