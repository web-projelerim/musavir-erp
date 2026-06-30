"use client";

import type {
  BeyanTakipDurum,
  BeyanTakipHucresi,
  BeyanTakipKolon,
  BeyanTakipNotu,
  Musteri,
} from "@/lib/types";
import { sonTarihDurumu, hesaplaSonTarih } from "@/lib/domain/beyanTakip";
import { BeyanTakipHucre } from "./BeyanTakipHucre";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, StickyNote } from "lucide-react";

interface Props {
  musteriler: Musteri[];
  kolonlar: BeyanTakipKolon[];
  hucreler: BeyanTakipHucresi[];
  notlar: BeyanTakipNotu[];
  donem: string;
  readOnly?: boolean;
  onDurumDegistir: (musteriId: string, vergiTuruKey: string, durum: BeyanTakipDurum) => void;
  onNotAc: (musteriId: string) => void;
}

function formatSonGun(kolon: BeyanTakipKolon, donem: string): string {
  const tarih = hesaplaSonTarih(kolon, donem);
  return tarih.getDate().toString();
}

export function BeyanTakipGrid({
  musteriler,
  kolonlar,
  hucreler,
  notlar,
  donem,
  readOnly,
  onDurumDegistir,
  onNotAc,
}: Props) {
  const hucreMap = new Map<string, BeyanTakipHucresi>();
  for (const h of hucreler) {
    hucreMap.set(`${h.musteriId}-${h.vergiTuruKey}`, h);
  }

  const notSayilari = new Map<string, number>();
  for (const n of notlar) {
    notSayilari.set(n.musteriId, (notSayilari.get(n.musteriId) ?? 0) + 1);
  }

  const aktifMusteriler = musteriler
    .filter((m) => m.durum === "aktif")
    .sort((a, b) => a.firmaAdi.localeCompare(b.firmaAdi, "tr"));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 border-b border-r border-slate-200 min-w-[180px]">
              Firma
            </th>
            {kolonlar.map((k) => {
              const durumu = sonTarihDurumu(k, donem);
              return (
                <th
                  key={k.key}
                  className={cn(
                    "px-1 py-2 text-center font-semibold border-b border-slate-200 whitespace-nowrap min-w-[48px]",
                    durumu === "gecikti" && "bg-red-50 text-red-700",
                    durumu === "yaklasan" && "bg-amber-50 text-amber-700",
                    durumu === "normal" && "text-slate-600"
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1">
                      {k.label}
                      {durumu !== "normal" && <AlertTriangle className="w-3 h-3" />}
                    </span>
                    <span className="text-[10px] font-normal opacity-70">
                      {formatSonGun(k, donem)}.
                    </span>
                  </div>
                </th>
              );
            })}
            <th className="px-2 py-2 text-center font-semibold text-slate-600 border-b border-l border-slate-200 min-w-[60px]">
              Notlar
            </th>
          </tr>
        </thead>
        <tbody>
          {aktifMusteriler.map((m, i) => {
            const notCount = notSayilari.get(m.id) ?? 0;
            return (
              <tr
                key={m.id}
                className={cn(
                  "hover:bg-slate-50 transition-colors",
                  i % 2 === 0 ? "bg-white" : "bg-slate-25"
                )}
              >
                <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 border-r border-slate-100 font-medium text-slate-800 truncate max-w-[200px]">
                  {m.firmaAdi}
                </td>
                {kolonlar.map((k) => (
                  <BeyanTakipHucre
                    key={k.key}
                    hucre={hucreMap.get(`${m.id}-${k.key}`)}
                    mukellef={m.vergiTurleri?.[k.key] === "mukellef"}
                    readOnly={readOnly}
                    onDurumDegistir={(durum) => onDurumDegistir(m.id, k.key, durum)}
                  />
                ))}
                <td className="px-2 py-1.5 text-center border-l border-slate-100">
                  <button
                    type="button"
                    onClick={() => onNotAc(m.id)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors",
                      notCount > 0
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    )}
                  >
                    <StickyNote className="w-3 h-3" />
                    {notCount > 0 && <span className="font-semibold">{notCount}</span>}
                  </button>
                </td>
              </tr>
            );
          })}
          {aktifMusteriler.length === 0 && (
            <tr>
              <td
                colSpan={kolonlar.length + 2}
                className="px-4 py-8 text-center text-sm text-slate-400"
              >
                Aktif müşteri bulunamadı
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
