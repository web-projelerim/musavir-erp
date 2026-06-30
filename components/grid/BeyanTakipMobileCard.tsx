"use client";

import type {
  BeyanTakipDurum,
  BeyanTakipHucresi,
  BeyanTakipKolon,
  BeyanTakipNotu,
  Musteri,
} from "@/lib/types";
import { takipDurumLabel } from "@/lib/domain/beyanTakip";
import { cn } from "@/lib/utils/cn";
import { StickyNote, Check, AlertTriangle } from "lucide-react";

interface Props {
  musteri: Musteri;
  kolonlar: BeyanTakipKolon[];
  hucreler: BeyanTakipHucresi[];
  notlar: BeyanTakipNotu[];
  readOnly?: boolean;
  onDurumDegistir: (vergiTuruKey: string, durum: BeyanTakipDurum) => void;
  onNotAc: () => void;
}

export function BeyanTakipMobileCard({
  musteri,
  kolonlar,
  hucreler,
  notlar,
  readOnly,
  onDurumDegistir,
  onNotAc,
}: Props) {
  const hucreMap = new Map<string, BeyanTakipHucresi>();
  for (const h of hucreler) {
    hucreMap.set(h.vergiTuruKey, h);
  }

  const aktifKolonlar = kolonlar.filter(
    (k) => musteri.vergiTurleri?.[k.key] === "mukellef"
  );

  if (aktifKolonlar.length === 0) return null;

  const notCount = notlar.length;
  const verilenSayisi = aktifKolonlar.filter((k) => {
    const h = hucreMap.get(k.key);
    return h?.durum === "tamamlandi" || h?.durum === "gonderildi";
  }).length;
  const tumVerildi = verilenSayisi === aktifKolonlar.length;

  return (
    <div className={cn(
      "bg-white rounded-xl border shadow-card",
      tumVerildi ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate">{musteri.firmaAdi}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{musteri.vknTckn}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            tumVerildi
              ? "bg-emerald-100 text-emerald-700"
              : verilenSayisi > 0
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          )}>
            {verilenSayisi}/{aktifKolonlar.length}
          </span>
          <button
            type="button"
            onClick={onNotAc}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors",
              notCount > 0
                ? "bg-amber-100 text-amber-700"
                : "text-slate-400 hover:bg-slate-100"
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
          const verildi = durum === "tamamlandi" || durum === "gonderildi";
          const sorunVar = durum === "sorun";

          return (
            <button
              key={k.key}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return;
                onDurumDegistir(k.key, verildi ? "bos" : "tamamlandi");
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                verildi && "bg-emerald-50 border-emerald-200",
                sorunVar && "bg-red-50 border-red-200",
                !verildi && !sorunVar && "bg-white border-slate-200",
                !readOnly && "active:scale-[0.98]"
              )}
            >
              <span className={cn(
                "font-medium",
                verildi ? "text-emerald-700" : sorunVar ? "text-red-700" : "text-slate-700"
              )}>
                {k.label}
              </span>
              <div className="flex items-center gap-2">
                {durum !== "bos" && durum !== "tamamlandi" && durum !== "gonderildi" && (
                  <span className="text-xs text-slate-500">{takipDurumLabel(durum)}</span>
                )}
                <div className={cn(
                  "w-6 h-6 rounded-md border-2 flex items-center justify-center",
                  verildi && "bg-emerald-500 border-emerald-500 text-white",
                  sorunVar && "bg-red-100 border-red-400 text-red-600",
                  !verildi && !sorunVar && "bg-white border-slate-300"
                )}>
                  {verildi && <Check className="w-4 h-4" strokeWidth={3} />}
                  {sorunVar && <AlertTriangle className="w-3 h-3" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
