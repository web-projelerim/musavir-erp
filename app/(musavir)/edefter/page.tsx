"use client";

import { useMemo, useState } from "react";
import { BookText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
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
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { createEDefterTakip, updateEDefterTakip } from "@/lib/firebase/repositories";
import { formatTarih } from "@/lib/utils/format";
import type { EDefterTakip, EDefterPeriyot, EDefterDurum, Musteri } from "@/lib/types";

/** Mükellefin e-defter periyodu (null → sorumlu değil) */
function eDefterPeriyot(m: Musteri): EDefterPeriyot | null {
  const v = m.eDefter;
  if (!v) return null;
  if (v === "yuklu_3aylik") return "3aylik";
  if (v === "yuklu_aylik" || v === "yuklu") return "aylik";
  return null;
}

function bugununDonemi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PERIYOT_LABEL: Record<EDefterPeriyot, string> = { aylik: "Aylık", "3aylik": "3 Aylık" };

const DURUM_LABELS: Record<EDefterDurum, string> = {
  gonderilmedi: "Gönderilmedi",
  gonderildi: "Gönderildi",
  gecikti: "Gecikti",
};
const DURUM_VARIANTS: Record<EDefterDurum, "success" | "neutral" | "danger"> = {
  gonderilmedi: "neutral",
  gonderildi: "success",
  gecikti: "danger",
};

interface Satir {
  musteri: Musteri;
  periyot: EDefterPeriyot;
  kayit?: EDefterTakip;
  durum: EDefterDurum;
}

export default function EDefterPage() {
  const { musteriler, loading: appLoading } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  const isStaff = user?.rol !== "mukellef";
  const takipler = useCollectionData<EDefterTakip>(
    COLLECTIONS.edefterTakip,
    [],
    !!user && isStaff,
    user?.ofisId
  );

  const [donem, setDonem] = useState<string>(bugununDonemi());
  const [override, setOverride] = useState<Record<string, EDefterDurum>>({});
  const [filtre, setFiltre] = useState<"tumu" | EDefterDurum>("tumu");
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [topluLoading, setTopluLoading] = useState(false);

  const guncelDonem = bugununDonemi();
  const gecmisDonem = donem < guncelDonem;
  const secilenAy = Number(donem.slice(5, 7));

  // Seçili döneme uygun mükellefler + o döneme ait takip kaydı
  const satirlar = useMemo<Satir[]>(() => {
    const kayitMap = new Map<string, EDefterTakip>();
    takipler.data.forEach((k) => {
      if (k.donem === donem) kayitMap.set(k.musteriId, k);
    });

    return musteriler
      .filter((m) => m.durum === "aktif")
      .map((m) => ({ m, periyot: eDefterPeriyot(m) }))
      .filter((x): x is { m: Musteri; periyot: EDefterPeriyot } => x.periyot !== null)
      // 3 aylık mükellefler yalnızca çeyrek sonu aylarında (Mar/Haz/Eyl/Ara) listelenir
      .filter((x) => x.periyot === "aylik" || [3, 6, 9, 12].includes(secilenAy))
      .map(({ m, periyot }): Satir => {
        const kayit = kayitMap.get(m.id);
        const kayitliDurum: EDefterDurum = override[m.id] ?? kayit?.durum ?? "gonderilmedi";
        // Geçmiş dönem + gönderilmedi → görsel olarak "gecikti"
        const durum: EDefterDurum =
          kayitliDurum === "gonderilmedi" && gecmisDonem ? "gecikti" : kayitliDurum;
        return { musteri: m, periyot, kayit, durum };
      })
      .sort((a, b) => a.musteri.firmaAdi.localeCompare(b.musteri.firmaAdi, "tr"));
  }, [musteriler, takipler.data, donem, secilenAy, gecmisDonem, override]);

  const filtreli = filtre === "tumu" ? satirlar : satirlar.filter((s) => s.durum === filtre);

  const ozet = useMemo(() => {
    const gonderildi = satirlar.filter((s) => s.durum === "gonderildi").length;
    const geciken = satirlar.filter((s) => s.durum === "gecikti").length;
    const bekleyen = satirlar.filter((s) => s.durum === "gonderilmedi").length;
    return { toplam: satirlar.length, gonderildi, geciken, bekleyen };
  }, [satirlar]);

  const toggleSecili = (id: string) => {
    setSecili((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const durumKaydet = async (satir: Satir, yeni: EDefterDurum) => {
    setOverride((prev) => ({ ...prev, [satir.musteri.id]: yeni }));
    try {
      const gonderimTarihi = yeni === "gonderildi" ? new Date().toISOString() : undefined;
      if (satir.kayit) {
        await updateEDefterTakip(satir.kayit.id, { durum: yeni, gonderimTarihi });
      } else if (user?.ofisId) {
        await createEDefterTakip({
          ofisId: user.ofisId,
          musteriId: satir.musteri.id,
          musteriAdi: satir.musteri.firmaAdi,
          donem,
          periyot: satir.periyot,
          durum: yeni,
          gonderimTarihi,
        });
      }
    } catch (err) {
      setOverride((prev) => {
        const next = { ...prev };
        delete next[satir.musteri.id];
        return next;
      });
      toast.error("Durum güncellenemedi", err instanceof Error ? err.message : undefined);
    }
  };

  const handleTopluGonderildi = async () => {
    const hedefler = satirlar.filter((s) => secili.has(s.musteri.id) && s.durum !== "gonderildi");
    if (hedefler.length === 0) {
      toast.warning("Gönderilmemiş kayıt seçilmedi");
      return;
    }
    setTopluLoading(true);
    let basarili = 0;
    for (const s of hedefler) {
      try {
        await durumKaydet(s, "gonderildi");
        basarili += 1;
      } catch {
        /* durumKaydet kendi hatasını yönetir */
      }
    }
    logAudit({
      action: "update",
      entityType: "edefter",
      entityId: "toplu",
      entityLabel: `${basarili} mükellef`,
      summary: `E-Defter (${donem}): ${basarili} mükellef gönderildi işaretlendi`,
    }).catch(() => undefined);
    if (basarili) toast.success("Toplu güncelleme tamam", `${basarili} mükellef gönderildi olarak işaretlendi`);
    setSecili(new Set());
    setTopluLoading(false);
  };

  if (appLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="E-Defter Takip"
        subtitle={`${satirlar.length} sorumlu mükellef · ${donem}`}
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "E-Defter Takip" }]}
        action={
          secili.size > 0 ? (
            <Button icon={<CheckCircle2 className="w-4 h-4" />} loading={topluLoading} onClick={handleTopluGonderildi}>
              {secili.size} Seçileni Gönderildi İşaretle
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <InfoBanner variant="info">
          Yükümlü mükellefler (E-Defter: <strong>Yüklü — Aylık / 3 Aylık</strong>) otomatik listelenir.
          3 aylık mükellefler yalnızca çeyrek sonu aylarında (Mart · Haziran · Eylül · Aralık) görünür.
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
              setSecili(new Set());
              setOverride({});
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <MetricCard title="Sorumlu Mükellef" value={String(ozet.toplam)} subtitle={donem} />
        <MetricCard title="Gönderildi" value={String(ozet.gonderildi)} variant="success" />
        <MetricCard title="Bekleyen" value={String(ozet.bekleyen)} variant="warning" />
        <MetricCard title="Geciken" value={String(ozet.geciken)} variant="danger" subtitle="Geçmiş dönem, gönderilmedi" />
      </div>

      {/* Filtre */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["tumu", "gonderilmedi", "gonderildi", "gecikti"] as const).map((d) => (
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
            {d === "tumu" ? "Tümü" : DURUM_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Boş durum */}
      {satirlar.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <BookText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Bu dönemde e-defter yükümlüsü aktif mükellef bulunmuyor.
          <p className="mt-1 text-xs text-slate-400">
            Mükellef kartında E-Defter alanını &quot;Yüklü — Aylık/3 Aylık&quot; olarak işaretleyin.
          </p>
        </div>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="w-10 px-3 py-2.5"></th>
                  <th className="px-3 py-2.5">Firma</th>
                  <th className="px-3 py-2.5">Periyot</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5">Gönderim Tarihi</th>
                  <th className="px-3 py-2.5 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtreli.map((s) => (
                  <tr key={s.musteri.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={secili.has(s.musteri.id)}
                        disabled={s.durum === "gonderildi"}
                        onChange={() => toggleSecili(s.musteri.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/musteriler/${s.musteri.id}`} className="font-medium text-slate-800 hover:text-blue-600">
                        {s.musteri.firmaAdi}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{PERIYOT_LABEL[s.periyot]}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={DURUM_VARIANTS[s.durum]}>{DURUM_LABELS[s.durum]}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {s.kayit?.gonderimTarihi ? formatTarih(s.kayit.gonderimTarihi) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {s.durum === "gonderildi" ? (
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => durumKaydet(s, "gonderilmedi")}>
                          Geri Al
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => durumKaydet(s, "gonderildi")}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Gönderildi
                        </Button>
                      )}
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
                  <div className="min-w-0">
                    <Link href={`/musteriler/${s.musteri.id}`} className="text-sm font-medium text-slate-800">
                      {s.musteri.firmaAdi}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {PERIYOT_LABEL[s.periyot]}
                      {s.kayit?.gonderimTarihi ? ` · ${formatTarih(s.kayit.gonderimTarihi)}` : ""}
                    </p>
                  </div>
                  <Badge variant={DURUM_VARIANTS[s.durum]}>{DURUM_LABELS[s.durum]}</Badge>
                </div>
                <div className="mt-2.5 flex justify-end">
                  {s.durum === "gonderildi" ? (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => durumKaydet(s, "gonderilmedi")}>
                      Geri Al
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => durumKaydet(s, "gonderildi")}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Gönderildi İşaretle
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Alt bilgi */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Bekleyen: {ozet.bekleyen}</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-400" /> Geciken: {ozet.geciken}</span>
      </div>
    </div>
  );
}
