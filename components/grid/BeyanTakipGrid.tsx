"use client";

import type {
  BeyanTakipDurum,
  BeyanTakipHucresi,
  BeyanTakipKolon,
  BeyanTakipNotu,
  Musteri,
} from "@/lib/types";
import { sonTarihDurumu, hesaplaSonTarih, musteriKolonSorumlu } from "@/lib/domain/beyanTakip";
import { BeyanTakipHucre } from "./BeyanTakipHucre";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, StickyNote, Calendar, CheckCheck } from "lucide-react";

interface Props {
  musteriler: Musteri[];
  kolonlar: BeyanTakipKolon[];
  hucreler: BeyanTakipHucresi[];
  notlar: BeyanTakipNotu[];
  donem: string;
  readOnly?: boolean;
  preFilteredAktif?: boolean;
  onDurumDegistir: (musteriId: string, vergiTuruKey: string, durum: BeyanTakipDurum) => void;
  onTahakkukDegistir: (musteriId: string, vergiTuruKey: string, yapildi: boolean) => void;
  onNotAc: (musteriId: string) => void;
  onTopluIslem?: (vergiTuruKey: string) => void;
}

function formatSonTarih(kolon: BeyanTakipKolon, donem: string): string {
  const tarih = hesaplaSonTarih(kolon, donem);
  return `${tarih.getDate()}.${tarih.getMonth() + 1}`;
}

export function BeyanTakipGrid({
  musteriler,
  kolonlar,
  hucreler,
  notlar,
  donem,
  readOnly,
  preFilteredAktif,
  onDurumDegistir,
  onTahakkukDegistir,
  onNotAc,
  onTopluIslem,
}: Props) {
  const hucreMap = new Map<string, BeyanTakipHucresi>();
  for (const h of hucreler) {
    hucreMap.set(`${h.musteriId}-${h.vergiTuruKey}`, h);
  }

  const notSayilari = new Map<string, number>();
  for (const n of notlar) {
    notSayilari.set(n.musteriId, (notSayilari.get(n.musteriId) ?? 0) + 1);
  }

  const aktifMusteriler = preFilteredAktif
    ? musteriler
    : musteriler
        .filter((m) => m.durum === "aktif")
        .sort((a, b) => a.firmaAdi.localeCompare(b.firmaAdi, "tr"));

  const tamamlananSayilari = new Map<string, { toplam: number; verildi: number }>();
  for (const m of aktifMusteriler) {
    let toplam = 0;
    let verildi = 0;
    for (const k of kolonlar) {
      if (!musteriKolonSorumlu(m, k.key)) continue;
      toplam++;
      const h = hucreMap.get(`${m.id}-${k.key}`);
      if (h?.durum === "tamamlandi" || h?.durum === "gonderildi") verildi++;
    }
    tamamlananSayilari.set(m.id, { toplam, verildi });
  }

  const sutunTamamlanma = new Map<string, { toplam: number; verildi: number }>();
  for (const k of kolonlar) {
    let toplam = 0;
    let verildi = 0;
    for (const m of aktifMusteriler) {
      if (!musteriKolonSorumlu(m, k.key)) continue;
      toplam++;
      const h = hucreMap.get(`${m.id}-${k.key}`);
      if (h?.durum === "tamamlandi" || h?.durum === "gonderildi") verildi++;
    }
    sutunTamamlanma.set(k.key, { toplam, verildi });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b-2 border-slate-200">
            <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]">
              Müşteri
            </th>
            {kolonlar.map((k) => {
              const durumu = sonTarihDurumu(k, donem);
              const st = sutunTamamlanma.get(k.key);
              const sutunTumVerildi = st && st.toplam > 0 && st.verildi === st.toplam;
              return (
                <th
                  key={k.key}
                  className={cn(
                    "px-2 py-3 text-center font-semibold whitespace-nowrap min-w-[72px] border-r border-slate-200",
                    durumu === "gecikti" && "bg-red-50 text-red-700",
                    durumu === "yaklasan" && "bg-amber-50 text-amber-700",
                    durumu === "normal" && "text-slate-600",
                    sutunTumVerildi && "bg-emerald-50/50"
                  )}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1 text-xs">
                      {k.label}
                      {durumu !== "normal" && <AlertTriangle className="w-3 h-3" />}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] font-normal opacity-60">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatSonTarih(k, donem)}
                    </span>
                    {st && st.toplam > 0 && (
                      <span className={cn(
                        "text-[9px] font-medium px-1 rounded",
                        sutunTumVerildi ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {st.verildi}/{st.toplam}
                      </span>
                    )}
                    {onTopluIslem && !sutunTumVerildi && st && st.toplam > 0 && (
                      <button
                        type="button"
                        onClick={() => onTopluIslem(k.key)}
                        className="mt-0.5 p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Tümünü tamamla"
                      >
                        <CheckCheck className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
            <th className="px-3 py-3 text-center font-semibold text-slate-600 border-l border-slate-200 min-w-[80px] text-xs">
              Durum
            </th>
            <th className="px-3 py-3 text-center font-semibold text-slate-600 border-l border-slate-200 min-w-[60px] text-xs">
              Not
            </th>
          </tr>
        </thead>
        <tbody>
          {aktifMusteriler.map((m, i) => {
            const notCount = notSayilari.get(m.id) ?? 0;
            const sayilar = tamamlananSayilari.get(m.id) ?? { toplam: 0, verildi: 0 };
            const tumVerildi = sayilar.toplam > 0 && sayilar.verildi === sayilar.toplam;
            const yuzde = sayilar.toplam > 0 ? Math.round((sayilar.verildi / sayilar.toplam) * 100) : 0;
            return (
              <tr
                key={m.id}
                className={cn(
                  "transition-colors",
                  tumVerildi ? "bg-emerald-50/40" : i % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                  "hover:bg-blue-50/40"
                )}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r border-slate-100 min-w-[200px]">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 text-sm truncate max-w-[200px]">{m.firmaAdi}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{m.vknTckn}</span>
                  </div>
                </td>
                {kolonlar.map((k) => (
                  <BeyanTakipHucre
                    key={k.key}
                    hucre={hucreMap.get(`${m.id}-${k.key}`)}
                    mukellef={musteriKolonSorumlu(m, k.key)}
                    readOnly={readOnly}
                    onDurumDegistir={(durum) => onDurumDegistir(m.id, k.key, durum)}
                    onTahakkukDegistir={(yapildi) => onTahakkukDegistir(m.id, k.key, yapildi)}
                  />
                ))}
                <td className="px-2 py-2 text-center border-l border-slate-100">
                  {sayilar.toplam > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                        tumVerildi
                          ? "bg-emerald-100 text-emerald-700"
                          : sayilar.verildi > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      )}>
                        {sayilar.verildi}/{sayilar.toplam}
                      </span>
                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            tumVerildi ? "bg-emerald-500" : yuzde > 0 ? "bg-amber-400" : "bg-slate-200"
                          )}
                          style={{ width: `${yuzde}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-center border-l border-slate-100">
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
                    <StickyNote className="w-3.5 h-3.5" />
                    {notCount > 0 && <span className="font-semibold">{notCount}</span>}
                  </button>
                </td>
              </tr>
            );
          })}
          {aktifMusteriler.length === 0 && (
            <tr>
              <td
                colSpan={kolonlar.length + 3}
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
