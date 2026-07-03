"use client";

import type {
  BeyanTakipDurum,
  BeyanTakipHucresi,
  BeyanTakipKolon,
  BeyanTakipNotu,
  Musteri,
} from "@/lib/types";
import { takipDurumLabel, musteriKolonSorumlu } from "@/lib/domain/beyanTakip";
import { cn } from "@/lib/utils/cn";
import { StickyNote, AlertTriangle } from "lucide-react";

interface Props {
  musteri: Musteri;
  kolonlar: BeyanTakipKolon[];
  hucreler: BeyanTakipHucresi[];
  notlar: BeyanTakipNotu[];
  readOnly?: boolean;
  onDurumDegistir: (vergiTuruKey: string, durum: BeyanTakipDurum) => void;
  onTahakkukDegistir: (vergiTuruKey: string, yapildi: boolean) => void;
  onNotAc: () => void;
}

export function BeyanTakipMobileCard({
  musteri,
  kolonlar,
  hucreler,
  notlar,
  readOnly,
  onDurumDegistir,
  onTahakkukDegistir,
  onNotAc,
}: Props) {
  const hucreMap = new Map<string, BeyanTakipHucresi>();
  for (const h of hucreler) {
    hucreMap.set(h.vergiTuruKey, h);
  }

  const aktifKolonlar = kolonlar.filter(
    (k) => musteriKolonSorumlu(musteri, k.key)
  );

  if (aktifKolonlar.length === 0) return null;

  const notCount = notlar.length;
  const verilenSayisi = aktifKolonlar.filter((k) => {
    const h = hucreMap.get(k.key);
    return h?.durum === "tamamlandi" || h?.durum === "gonderildi";
  }).length;
  const tumVerildi = verilenSayisi === aktifKolonlar.length;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border shadow-card",
        tumVerildi ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{musteri.firmaAdi}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{musteri.vknTckn}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              tumVerildi
                ? "bg-emerald-100 text-emerald-700"
                : verilenSayisi > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {verilenSayisi}/{aktifKolonlar.length}
          </span>
          <button
            type="button"
            onClick={onNotAc}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors",
              notCount > 0 ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-100"
            )}
          >
            <StickyNote className="w-3.5 h-3.5" />
            {notCount > 0 && <span className="font-semibold">{notCount}</span>}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        {aktifKolonlar.map((k) => {
          const hucre = hucreMap.get(k.key);
          const durum: BeyanTakipDurum = hucre?.durum ?? "bos";
          const beyan = durum === "tamamlandi" || durum === "gonderildi";
          const sorun = durum === "sorun";
          const ara = durum !== "bos" && !beyan && !sorun;
          const tahakkuk = hucre?.tahakkukYapildi === true;

          return (
            <div
              key={k.key}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                beyan && "bg-emerald-50 border-emerald-200",
                sorun && "bg-red-50 border-red-200",
                ara && "bg-amber-50 border-amber-200",
                !beyan && !sorun && !ara && "bg-red-50/60 border-red-100"
              )}
            >
              <span
                className={cn(
                  "font-medium flex items-center gap-1.5",
                  beyan ? "text-emerald-700" : sorun ? "text-red-700" : ara ? "text-amber-700" : "text-slate-600"
                )}
              >
                {k.label}
                {sorun && <AlertTriangle className="w-3.5 h-3.5" />}
                {ara && <span className="text-[10px] font-normal text-amber-600">({takipDurumLabel(durum)})</span>}
              </span>

              <div className="flex items-center gap-1.5">
                {/* B — Beyan */}
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && onDurumDegistir(k.key, beyan ? "bos" : "tamamlandi")}
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all",
                    beyan
                      ? "bg-emerald-600 text-white"
                      : "bg-white border-2 border-red-300 text-red-400",
                    !readOnly && "active:scale-95"
                  )}
                  title={beyan ? "Beyanname verildi — geri al" : "Beyanı işaretle"}
                >
                  B
                </button>
                {/* T — Tahakkuk (yalnızca beyan sonrası anlamlı) */}
                <button
                  type="button"
                  disabled={readOnly || !beyan}
                  onClick={() => !readOnly && beyan && onTahakkukDegistir(k.key, !tahakkuk)}
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all",
                    !beyan
                      ? "bg-slate-100 text-slate-300"
                      : tahakkuk
                      ? "bg-emerald-600 text-white"
                      : "bg-white border-2 border-emerald-300 text-emerald-500",
                    !readOnly && beyan && "active:scale-95"
                  )}
                  title={!beyan ? "Önce beyanı işaretleyin" : tahakkuk ? "Tahakkuk yapıldı — geri al" : "Tahakkuku işaretle"}
                >
                  T
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
