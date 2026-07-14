"use client";

import { useMemo, useState } from "react";
import { Receipt, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { InfoBanner } from "@/components/ui/InfoBanner";
import { useAppData } from "@/lib/hooks/useAppData";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { createPosTakip, updatePosTakip } from "@/lib/firebase/repositories";
import { formatTarih } from "@/lib/utils/format";
import type { PosTakip, PosTuru, PosDurum, Musteri } from "@/lib/types";

function bugununDonemi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const POS_LABEL: Record<PosTuru, string> = { fiziksel_pos: "Fiziksel", sanal_pos: "Sanal" };

interface PosSatir {
  musteri: Musteri;
  turler: PosTuru[];
  kayit?: PosTakip;
  hasFiziksel: boolean;
  hasSanal: boolean;
  zDurum: PosDurum;
  kkDurum: PosDurum;
}

function DurumHucre({
  durum,
  aktif,
  onToggle,
}: {
  durum: PosDurum;
  aktif: boolean;
  onToggle: () => void;
}) {
  if (!aktif) return <span className="text-xs text-slate-300">—</span>;
  const teslim = durum === "teslim_edildi";
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
        teslim
          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
          : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
      }`}
    >
      {teslim ? <CheckCircle2 className="h-3 w-3" /> : null}
      {teslim ? "Girildi" : "Eksik"}
    </button>
  );
}

export default function PosTakipPage() {
  const { musteriler, loading: appLoading } = useAppData();
  const { user } = useAuth();
  const toast = useToast();

  const isStaff = user?.rol !== "mukellef";
  const takipler = useCollectionData<PosTakip>(COLLECTIONS.posTakip, [], !!user && isStaff, user?.ofisId);

  const [donem, setDonem] = useState<string>(bugununDonemi());
  const guncelDonem = bugununDonemi();
  const [override, setOverride] = useState<Record<string, { z?: PosDurum; kk?: PosDurum }>>({});
  const [filtre, setFiltre] = useState<"tumu" | "eksik">("tumu");

  const satirlar = useMemo<PosSatir[]>(() => {
    const kayitMap = new Map<string, PosTakip>();
    takipler.data.forEach((k) => {
      if (k.donem === donem) kayitMap.set(k.musteriId, k);
    });

    return musteriler
      .filter((m) => m.durum === "aktif" && (m.posTuru?.length ?? 0) > 0)
      .map((m): PosSatir => {
        const turler = m.posTuru ?? [];
        const hasFiziksel = turler.includes("fiziksel_pos");
        const hasSanal = turler.includes("sanal_pos");
        const kayit = kayitMap.get(m.id);
        const ov = override[m.id] ?? {};
        const zDurum: PosDurum = hasFiziksel
          ? ov.z ?? kayit?.zRaporuDurumu ?? "teslim_edilmedi"
          : "gerek_yok";
        const kkDurum: PosDurum = hasSanal
          ? ov.kk ?? kayit?.kkSatislariDurumu ?? "teslim_edilmedi"
          : "gerek_yok";
        return { musteri: m, turler, kayit, hasFiziksel, hasSanal, zDurum, kkDurum };
      })
      .sort((a, b) => a.musteri.firmaAdi.localeCompare(b.musteri.firmaAdi, "tr"));
  }, [musteriler, takipler.data, donem, override]);

  const eksikMi = (s: PosSatir) =>
    (s.hasFiziksel && s.zDurum !== "teslim_edildi") || (s.hasSanal && s.kkDurum !== "teslim_edildi");

  const filtreli = filtre === "eksik" ? satirlar.filter(eksikMi) : satirlar;

  const ozet = useMemo(() => {
    const fiziksel = satirlar.filter((s) => s.hasFiziksel).length;
    const zEksik = satirlar.filter((s) => s.hasFiziksel && s.zDurum !== "teslim_edildi").length;
    const kkEksik = satirlar.filter((s) => s.hasSanal && s.kkDurum !== "teslim_edildi").length;
    return { toplam: satirlar.length, fiziksel, zEksik, kkEksik };
  }, [satirlar]);

  const kaydet = async (s: PosSatir, alan: "z" | "kk", yeni: PosDurum) => {
    setOverride((prev) => ({ ...prev, [s.musteri.id]: { ...prev[s.musteri.id], [alan]: yeni } }));
    try {
      const patch =
        alan === "z" ? { zRaporuDurumu: yeni } : { kkSatislariDurumu: yeni };
      if (s.kayit) {
        await updatePosTakip(s.kayit.id, patch);
      } else if (user?.ofisId) {
        await createPosTakip({
          ofisId: user.ofisId,
          musteriId: s.musteri.id,
          musteriAdi: s.musteri.firmaAdi,
          donem,
          posTuru: s.turler,
          zRaporuDurumu: alan === "z" ? yeni : s.hasFiziksel ? "teslim_edilmedi" : "gerek_yok",
          kkSatislariDurumu: alan === "kk" ? yeni : s.hasSanal ? "teslim_edilmedi" : "gerek_yok",
        });
      }
    } catch (err) {
      setOverride((prev) => {
        const next = { ...prev };
        delete next[s.musteri.id];
        return next;
      });
      toast.error("Kaydedilemedi", err instanceof Error ? err.message : undefined);
    }
  };

  const toggle = (s: PosSatir, alan: "z" | "kk") => {
    const mevcut = alan === "z" ? s.zDurum : s.kkDurum;
    kaydet(s, alan, mevcut === "teslim_edildi" ? "teslim_edilmedi" : "teslim_edildi");
  };

  if (appLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="POS / Z Raporu Takip"
        subtitle={`${satirlar.length} POS'lu mükellef · ${donem}`}
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "POS / Z Raporu" }]}
      />

      <div className="mb-4">
        <InfoBanner variant="info">
          POS türü tanımlı aktif mükellefler listelenir. <strong>Fiziksel POS</strong> için Z raporu teslimi,
          <strong> Sanal POS</strong> için kredi kartı satışlarının girildiği takip edilir. Duruma tıklayarak değiştirin.
        </InfoBanner>
      </div>

      {/* Dönem seçici */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Dönem</label>
          <input
            type="month"
            value={donem}
            max={guncelDonem}
            onChange={(e) => {
              setDonem(e.target.value || guncelDonem);
              setOverride({});
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <MetricCard title="POS'lu Mükellef" value={String(ozet.toplam)} subtitle={donem} />
        <MetricCard title="Fiziksel POS" value={String(ozet.fiziksel)} />
        <MetricCard title="Z Raporu Eksik" value={String(ozet.zEksik)} variant="danger" />
        <MetricCard title="KK Satışı Eksik" value={String(ozet.kkEksik)} variant="warning" />
      </div>

      {/* Filtre */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["tumu", "eksik"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFiltre(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              filtre === d
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {d === "tumu" ? "Tümü" : "Eksik Olanlar"}
          </button>
        ))}
      </div>

      {satirlar.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <Receipt className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          POS türü tanımlı aktif mükellef bulunmuyor.
          <p className="mt-1 text-xs text-slate-400">
            Mükellef kartındaki &quot;POS Türü&quot; alanından Fiziksel / Sanal POS işaretleyin.
          </p>
        </div>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2.5">Firma</th>
                  <th className="px-3 py-2.5">POS Türü</th>
                  <th className="px-3 py-2.5">Z Raporu</th>
                  <th className="px-3 py-2.5">KK Satışları</th>
                  <th className="px-3 py-2.5">Güncelleme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtreli.map((s) => (
                  <tr key={s.musteri.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <Link href={`/musteriler/${s.musteri.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                        {s.musteri.firmaAdi}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {s.turler.map((t) => (
                          <Badge key={t} variant={t === "fiziksel_pos" ? "info" : "neutral"}>
                            {POS_LABEL[t]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <DurumHucre durum={s.zDurum} aktif={s.hasFiziksel} onToggle={() => toggle(s, "z")} />
                    </td>
                    <td className="px-3 py-2.5">
                      <DurumHucre durum={s.kkDurum} aktif={s.hasSanal} onToggle={() => toggle(s, "kk")} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {s.kayit?.updatedAt ? formatTarih(s.kayit.updatedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil kartlar */}
          <div className="md:hidden space-y-2">
            {filtreli.map((s) => (
              <div key={s.musteri.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/musteriler/${s.musteri.id}`} className="text-sm font-medium text-slate-800">
                    {s.musteri.firmaAdi}
                  </Link>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {s.turler.map((t) => (
                      <Badge key={t} variant={t === "fiziksel_pos" ? "info" : "neutral"}>
                        {POS_LABEL[t]}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-4">
                  {s.hasFiziksel && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Z Raporu:</span>
                      <DurumHucre durum={s.zDurum} aktif onToggle={() => toggle(s, "z")} />
                    </div>
                  )}
                  {s.hasSanal && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">KK:</span>
                      <DurumHucre durum={s.kkDurum} aktif onToggle={() => toggle(s, "kk")} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
