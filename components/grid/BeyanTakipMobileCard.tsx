"use client";

import type {
  BeyanTakipDurum,
  BeyanTakipHucresi,
  BeyanTakipKolon,
  BeyanTakipNotu,
  Musteri,
} from "@/lib/types";
import { takipDurumRenk } from "@/lib/domain/beyanTakip";
import { cn } from "@/lib/utils/cn";
import { StickyNote } from "lucide-react";

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{musteri.firmaAdi}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{musteri.vknTckn}</p>
        </div>
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
          <StickyNote className="w-3 h-3" />
          {notCount > 0 && <span className="font-semibold">{notCount}</span>}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {aktifKolonlar.map((k) => {
          const hucre = hucreMap.get(k.key);
          const durum: BeyanTakipDurum = hucre?.durum ?? "bos";
          const renk = takipDurumRenk(durum);
          return (
            <button
              key={k.key}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return;
                const sirali: BeyanTakipDurum[] = [
                  "bos", "evrak_bekleniyor", "hazirlaniyor", "kontrol", "gonderildi", "tamamlandi",
                ];
                const idx = sirali.indexOf(durum);
                const sonraki = idx >= 0 && idx < sirali.length - 1 ? sirali[idx + 1] : sirali[0];
                onDurumDegistir(k.key, sonraki);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-colors",
                renk.bg,
                renk.border,
                renk.renk,
                !readOnly && "active:scale-95"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", renk.bg, "ring-1", renk.border)} />
              {k.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
