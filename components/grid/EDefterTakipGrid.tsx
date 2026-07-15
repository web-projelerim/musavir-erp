"use client";

import { AlertTriangle, Calendar, CheckCheck } from "lucide-react";
import type { EDefterDurum, EDefterPeriyot, Musteri } from "@/lib/types";
import { edefterDonemSonTarihi, tarihTR, ucAylikDonemMi } from "@/lib/domain/edefterPlan";
import { cn } from "@/lib/utils/cn";

export const AY_KISA = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export interface EDefterSatir {
  musteri: Musteri;
  periyot: EDefterPeriyot;
}

/** Hücre anahtarı — musteriId "-" içerebildiği için ayraç "|" */
export function hucreAnahtar(musteriId: string, donem: string): string {
  return `${musteriId}|${donem}`;
}

export function donemStr(yil: number, ay: number): string {
  return `${yil}-${String(ay + 1).padStart(2, "0")}`;
}

/** Mükellef bu dönemden sorumlu mu? (3 aylık yalnızca çeyreğin kapandığı dönemlerde) */
export function edefterSorumlu(periyot: EDefterPeriyot, donemAy: number): boolean {
  return periyot === "aylik" || ucAylikDonemMi(donemAy);
}

interface Props {
  satirlar: EDefterSatir[];
  /** Hücre durumları — anahtar: hucreAnahtar(musteriId, donem) */
  durumMap: Map<string, EDefterDurum>;
  yil: number;
  readOnly?: boolean;
  onDurumDegistir: (satir: EDefterSatir, donem: string, durum: EDefterDurum) => void;
  onTopluDonem?: (donemAy: number) => void;
}

const HUCRE_STIL: Record<EDefterDurum, string> = {
  gonderildi: "bg-emerald-600 text-white hover:bg-emerald-700",
  gecikti: "bg-red-400 text-white hover:bg-red-500",
  gonderilmedi: "bg-slate-100 text-slate-400 hover:bg-slate-200",
};

export function EDefterTakipGrid({
  satirlar,
  durumMap,
  yil,
  readOnly,
  onDurumDegistir,
  onTopluDonem,
}: Props) {
  const durumOf = (musteriId: string, donem: string): EDefterDurum =>
    durumMap.get(hucreAnahtar(musteriId, donem)) ?? "gonderilmedi";

  const sutunSayi = AY_KISA.map((_, ay) => {
    let toplam = 0;
    let gonderildi = 0;
    let gecikti = 0;
    for (const s of satirlar) {
      if (!edefterSorumlu(s.periyot, ay)) continue;
      toplam++;
      const d = durumOf(s.musteri.id, donemStr(yil, ay));
      if (d === "gonderildi") gonderildi++;
      if (d === "gecikti") gecikti++;
    }
    return { toplam, gonderildi, gecikti };
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-700 border-b border-slate-600">
            <th className="sticky left-0 z-20 bg-slate-700 px-4 py-1.5 text-left text-xs font-medium text-slate-300 border-r border-slate-600 min-w-[200px] uppercase tracking-wide">
              Mükellef
            </th>
            {AY_KISA.map((ad, ay) => {
              const st = sutunSayi[ay];
              const tumGonderildi = st.toplam > 0 && st.gonderildi === st.toplam;
              return (
                <th
                  key={ad}
                  className={cn(
                    "px-2 py-1.5 text-center text-xs font-medium whitespace-nowrap min-w-[76px] border-r border-slate-600 text-slate-200",
                    tumGonderildi && "bg-emerald-600/80",
                    !tumGonderildi && st.gecikti > 0 && "bg-red-600/80"
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-semibold">{ad}</span>
                    {!tumGonderildi && st.gecikti > 0 && (
                      <AlertTriangle className="w-2.5 h-2.5 text-white/80" />
                    )}
                    {st.toplam > 0 && (
                      <span className="text-[9px] font-medium text-slate-400">
                        {st.gonderildi}/{st.toplam}
                      </span>
                    )}
                    {onTopluDonem && !readOnly && !tumGonderildi && st.toplam > 0 && (
                      <button
                        type="button"
                        onClick={() => onTopluDonem(ay)}
                        className="p-0.5 text-slate-400 hover:text-white rounded transition-colors"
                        title={`${ad} ${yil} dönemini tümüyle gönderildi işaretle`}
                      >
                        <CheckCheck className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
            <th className="sticky right-0 z-20 bg-slate-700 px-3 py-1.5 text-center text-xs font-medium text-slate-300 border-l border-slate-600 min-w-[80px] uppercase tracking-wide">
              Durum
            </th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s, i) => {
            let toplam = 0;
            let gonderildi = 0;
            for (let ay = 0; ay < 12; ay++) {
              if (!edefterSorumlu(s.periyot, ay)) continue;
              toplam++;
              if (durumOf(s.musteri.id, donemStr(yil, ay)) === "gonderildi") gonderildi++;
            }
            const tumGonderildi = toplam > 0 && gonderildi === toplam;
            const yuzde = toplam > 0 ? Math.round((gonderildi / toplam) * 100) : 0;
            // Sticky sütun OPAK olmalı — yoksa yatay kaydırmada hücreler arkasından görünür
            const stickyBg = tumGonderildi ? "bg-emerald-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50";

            return (
              <tr
                key={s.musteri.id}
                className={cn(
                  "transition-colors hover:bg-blue-50/40",
                  tumGonderildi ? "bg-emerald-50/40" : i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                )}
              >
                <td className={cn("sticky left-0 z-10 px-4 py-2 border-r border-slate-100 min-w-[200px]", stickyBg)}>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 text-sm truncate max-w-[200px]">
                      {s.musteri.firmaAdi}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {s.periyot === "aylik" ? "Aylık" : "3 Aylık"}
                    </span>
                  </div>
                </td>

                {AY_KISA.map((ad, ay) => {
                  if (!edefterSorumlu(s.periyot, ay)) {
                    return (
                      <td key={ad} className="p-1 border-r border-slate-100">
                        <div
                          className="h-9 rounded bg-slate-50 border border-slate-100"
                          title="Bu dönemden sorumlu değil"
                        />
                      </td>
                    );
                  }
                  const donem = donemStr(yil, ay);
                  const durum = durumOf(s.musteri.id, donem);
                  const sonTarih = edefterDonemSonTarihi(yil, ay, s.periyot === "aylik" ? "aylik" : "3aylik");
                  const yeni: EDefterDurum = durum === "gonderildi" ? "gonderilmedi" : "gonderildi";

                  return (
                    <td key={ad} className="p-1 border-r border-slate-100">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onDurumDegistir(s, donem, yeni)}
                        title={`${s.musteri.firmaAdi} — ${ad} ${yil} dönemi · son yükleme ${tarihTR(sonTarih)}`}
                        className={cn(
                          "w-full h-9 rounded text-xs font-bold transition-colors flex items-center justify-center",
                          HUCRE_STIL[durum],
                          readOnly && "cursor-default opacity-70"
                        )}
                      >
                        {durum === "gonderildi" ? "✓" : durum === "gecikti" ? "!" : ""}
                      </button>
                    </td>
                  );
                })}

                <td className={cn("sticky right-0 z-10 px-2 py-2 text-center border-l border-slate-100", stickyBg)}>
                  {toplam > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                          tumGonderildi
                            ? "bg-emerald-100 text-emerald-700"
                            : gonderildi > 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {gonderildi}/{toplam}
                      </span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            tumGonderildi ? "bg-emerald-500" : yuzde > 0 ? "bg-amber-400" : "bg-slate-200"
                          )}
                          style={{ width: `${yuzde}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}

          {satirlar.length === 0 && (
            <tr>
              <td colSpan={14} className="px-4 py-8 text-center text-sm text-slate-400">
                e-Defter yükümlüsü aktif mükellef bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Grid altındaki renk/işaret açıklaması */
export function EDefterGridLejant() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-card">
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-emerald-600" /> Gönderildi
      </span>
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-red-400" /> Gecikti (son tarih geçti)
      </span>
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200" /> Bekliyor
      </span>
      <span className="flex items-center gap-2">
        <span className="w-4 h-4 rounded bg-slate-50 border border-slate-100" /> Sorumlu değil
      </span>
      <span className="ml-auto flex items-center gap-1.5 text-slate-500">
        <Calendar className="w-3.5 h-3.5" />
        Hücreye tıklayınca gönderildi ↔ bekliyor değişir
      </span>
    </div>
  );
}
