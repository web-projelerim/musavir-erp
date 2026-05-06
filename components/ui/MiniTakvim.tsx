"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, CheckSquare, CreditCard, Dot, Receipt } from "lucide-react";
import Link from "next/link";

export interface TakvimOlay {
  tarih: string; // ISO
  renk: "red" | "blue" | "amber" | "emerald" | "purple";
  etiket: string;
  href?: string;
  tur?: "beyanname" | "gorev" | "tahsilat" | "vergi" | "diger";
  durum?: string;
  aciklama?: string;
}

interface Props {
  olaylar: TakvimOlay[];
}

const GUN_ADLARI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"];
const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const RENK_DOT: Record<TakvimOlay["renk"], string> = {
  red:     "bg-red-500",
  blue:    "bg-blue-500",
  amber:   "bg-amber-500",
  emerald: "bg-emerald-500",
  purple:  "bg-purple-500",
};

const RENK_ICON_BG: Record<TakvimOlay["renk"], string> = {
  red:     "bg-red-100 text-red-700",
  blue:    "bg-blue-100 text-blue-700",
  amber:   "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  purple:  "bg-purple-100 text-purple-700",
};

const RENK_DAY_BG: Record<TakvimOlay["renk"], string> = {
  red:     "bg-red-50",
  blue:    "bg-blue-50",
  amber:   "bg-amber-50",
  emerald: "bg-emerald-50",
  purple:  "bg-purple-50",
};

const DURUM_LABEL: Record<string, string> = {
  bekliyor:    "Bekliyor",
  verildi:     "Verildi",
  gecikti:     "Gecikti",
  tamamlandi:  "Tamamlandı",
  devam:       "Devam",
  beklemede:   "Beklemede",
  odendi:      "Ödendi",
};

function OlayIcon({ tur }: { tur?: TakvimOlay["tur"] }) {
  if (tur === "beyanname") return <FileText className="w-3.5 h-3.5" />;
  if (tur === "gorev")     return <CheckSquare className="w-3.5 h-3.5" />;
  if (tur === "tahsilat")  return <CreditCard className="w-3.5 h-3.5" />;
  if (tur === "vergi")     return <Receipt className="w-3.5 h-3.5" />;
  return <Dot className="w-3.5 h-3.5" />;
}

function isoToLocalDateStr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTarihStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${AY_ADLARI[m - 1]} ${y}`;
}

export function MiniTakvim({ olaylar }: Props) {
  const today = new Date();
  const todayStr = isoToLocalDateStr(today.toISOString());

  const [gosterilen, setGosterilen] = useState({
    yil: today.getFullYear(),
    ay: today.getMonth(),
  });
  const [secilenGun, setSecilenGun] = useState<string | null>(todayStr);

  const { yil, ay } = gosterilen;

  const gunler = useMemo(() => {
    const ilkGun = new Date(yil, ay, 1);
    const baslangicOffset = (ilkGun.getDay() + 6) % 7;
    const aydakiGunSayisi = new Date(yil, ay + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < baslangicOffset; i++) cells.push(null);
    for (let d = 1; d <= aydakiGunSayisi; d++) cells.push(d);
    return cells;
  }, [yil, ay]);

  // Tüm olayları tarih→olaylar haritasına çevir
  const olayHaritasi = useMemo(() => {
    const map = new Map<string, TakvimOlay[]>();
    for (const olay of olaylar) {
      const str = isoToLocalDateStr(olay.tarih);
      if (!str) continue;
      map.set(str, [...(map.get(str) ?? []), olay]);
    }
    return map;
  }, [olaylar]);

  const buAyOlaySayisi = useMemo(() => {
    let count = 0;
    olayHaritasi.forEach((items, dateStr) => {
      const [oYil, oAy] = dateStr.split("-").map(Number);
      if (oYil === yil && oAy - 1 === ay) count += items.length;
    });
    return count;
  }, [olayHaritasi, yil, ay]);

  const secilenOlaylar = secilenGun ? (olayHaritasi.get(secilenGun) ?? []) : [];

  function oncekiAy() {
    setGosterilen((p) => p.ay === 0 ? { yil: p.yil - 1, ay: 11 } : { ...p, ay: p.ay - 1 });
    setSecilenGun(null);
  }
  function sonrakiAy() {
    setGosterilen((p) => p.ay === 11 ? { yil: p.yil + 1, ay: 0 } : { ...p, ay: p.ay + 1 });
    setSecilenGun(null);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Takvim</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {buAyOlaySayisi > 0 ? `${buAyOlaySayisi} etkinlik bu ay` : "Bu ay etkinlik yok"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={oncekiAy}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 px-2 min-w-[130px] text-center">
            {AY_ADLARI[ay]} {yil}
          </span>
          <button
            type="button"
            onClick={sonrakiAy}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Gün başlıkları */}
        <div className="grid grid-cols-7 mb-1">
          {GUN_ADLARI.map((g) => (
            <div key={g} className="text-center text-xs font-medium text-slate-400 py-1.5">
              {g}
            </div>
          ))}
        </div>

        {/* Gün hücreleri */}
        <div className="grid grid-cols-7 gap-y-1">
          {gunler.map((gun, idx) => {
            if (gun === null) return <div key={`empty-${idx}`} />;

            const dateStr = `${yil}-${String(ay + 1).padStart(2, "0")}-${String(gun).padStart(2, "0")}`;
            const isToday    = dateStr === todayStr;
            const isSelected = dateStr === secilenGun;
            const gunOlaylari = olayHaritasi.get(dateStr) ?? [];
            const hasOlay    = gunOlaylari.length > 0;
            const noktalar   = gunOlaylari.slice(0, 4);
            // Günün baskın rengi (ilk olay belirler) — %40 opasite arka plan tonu
            const baskınRenk = hasOlay ? gunOlaylari[0].renk : null;
            const gunBg = !isSelected && baskınRenk ? RENK_DAY_BG[baskınRenk] : "";

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSecilenGun(isSelected ? null : dateStr)}
                className={[
                  "relative flex flex-col items-center py-1 rounded-lg transition-colors cursor-pointer",
                  isSelected ? "bg-blue-50 ring-1 ring-blue-200" : hasOlay ? `${gunBg} hover:brightness-95` : "hover:bg-slate-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "text-xs w-9 h-9 flex items-center justify-center rounded-full font-medium transition-colors",
                    isToday && isSelected
                      ? "bg-blue-600 text-white font-bold"
                      : isToday
                      ? "bg-blue-600 text-white font-bold"
                      : isSelected
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : hasOlay
                      ? "text-slate-800 font-semibold"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  {gun}
                </span>
                {noktalar.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 h-2 items-center">
                    {noktalar.map((o, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${RENK_DOT[o.renk]}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Lejant */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" /> Beyanname
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" /> Görev
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" /> Tahsilat
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0" /> Vergi Takvimi
          </span>
        </div>
      </div>

      {/* Seçilen gün etkinlik paneli */}
      {secilenGun !== null && (
        <div className="border-t border-slate-100 bg-slate-50">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-slate-700">
              {formatTarihStr(secilenGun)}
              {secilenOlaylar.length > 0 && (
                <span className="ml-1.5 font-normal text-slate-500">
                  — {secilenOlaylar.length} etkinlik
                </span>
              )}
            </p>
          </div>

          {secilenOlaylar.length === 0 ? (
            <p className="px-5 pb-4 text-xs text-slate-400">Bu gün için etkinlik yok.</p>
          ) : (
            <div className="divide-y divide-slate-100 pb-2">
              {secilenOlaylar.map((olay, i) => {
                const iconBg = RENK_ICON_BG[olay.renk];
                const durumLabel = olay.durum ? (DURUM_LABEL[olay.durum] ?? olay.durum) : undefined;

                const inner = (
                  <div className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-colors group">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                      <OlayIcon tur={olay.tur} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium text-slate-800 truncate">{olay.etiket}</span>
                      {olay.aciklama && (
                        <span className="block text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{olay.aciklama}</span>
                      )}
                      {durumLabel && !olay.aciklama && (
                        <span className="text-[10px] text-slate-400">{durumLabel}</span>
                      )}
                    </span>
                    {olay.href && (
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                    )}
                  </div>
                );

                return olay.href ? (
                  <Link key={i} href={olay.href} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={i}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
