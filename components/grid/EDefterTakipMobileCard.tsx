"use client";

import type { EDefterDurum } from "@/lib/types";
import { edefterDonemSonTarihi, tarihTR } from "@/lib/domain/edefterPlan";
import { cn } from "@/lib/utils/cn";
import { AY_KISA, donemStr, edefterSorumlu, hucreAnahtar, type EDefterSatir } from "./EDefterTakipGrid";

interface Props {
  satir: EDefterSatir;
  durumMap: Map<string, EDefterDurum>;
  yil: number;
  readOnly?: boolean;
  onDurumDegistir: (satir: EDefterSatir, donem: string, durum: EDefterDurum) => void;
}

const CIP_STIL: Record<EDefterDurum, string> = {
  gonderildi: "bg-emerald-600 text-white",
  gecikti: "bg-red-400 text-white",
  gonderilmedi: "bg-slate-100 text-slate-500",
};

/** Mobil (< md) e-Defter kartı — 12 dönem, dokunmatik hedefe uygun çipler */
export function EDefterTakipMobileCard({ satir, durumMap, yil, readOnly, onDurumDegistir }: Props) {
  let toplam = 0;
  let gonderildi = 0;
  for (let ay = 0; ay < 12; ay++) {
    if (!edefterSorumlu(satir.periyot, ay)) continue;
    toplam++;
    if (durumMap.get(hucreAnahtar(satir.musteri.id, donemStr(yil, ay))) === "gonderildi") gonderildi++;
  }
  const tumGonderildi = toplam > 0 && gonderildi === toplam;

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3 shadow-card",
        tumGonderildi ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{satir.musteri.firmaAdi}</p>
          <p className="text-[11px] text-slate-400">
            {satir.periyot === "aylik" ? "Aylık" : "3 Aylık"}
          </p>
        </div>
        <span
          className={cn(
            "flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
            tumGonderildi
              ? "bg-emerald-100 text-emerald-700"
              : gonderildi > 0
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          )}
        >
          {gonderildi}/{toplam}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {AY_KISA.map((ad, ay) => {
          if (!edefterSorumlu(satir.periyot, ay)) {
            return (
              <div
                key={ad}
                className="min-h-[44px] rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-300"
                title="Sorumlu değil"
              >
                {ad}
              </div>
            );
          }
          const donem = donemStr(yil, ay);
          const durum = durumMap.get(hucreAnahtar(satir.musteri.id, donem)) ?? "gonderilmedi";
          const sonTarih = edefterDonemSonTarihi(yil, ay, satir.periyot === "aylik" ? "aylik" : "3aylik");
          const yeni: EDefterDurum = durum === "gonderildi" ? "gonderilmedi" : "gonderildi";

          return (
            <button
              key={ad}
              type="button"
              disabled={readOnly}
              onClick={() => onDurumDegistir(satir, donem, yeni)}
              title={`${ad} ${yil} · son yükleme ${tarihTR(sonTarih)}`}
              className={cn(
                "min-h-[44px] rounded-lg text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors",
                CIP_STIL[durum],
                readOnly && "opacity-70"
              )}
            >
              <span>{ad}</span>
              {durum === "gonderildi" && <span className="text-[11px] leading-none">✓</span>}
              {durum === "gecikti" && <span className="text-[11px] leading-none">!</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
