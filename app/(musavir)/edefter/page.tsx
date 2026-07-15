"use client";

import { useCallback, useMemo, useState } from "react";
import { BookText, AlertTriangle, ChevronLeft, ChevronRight, Search, X, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { PageLoading } from "@/components/ui/PageLoading";
import { InfoBanner } from "@/components/ui/InfoBanner";
import { useAppData } from "@/lib/hooks/useAppData";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import { createEDefterTakip, updateEDefterTakip } from "@/lib/firebase/repositories";
import { edefterBeratPlani, edefterDonemSonTarihi, tarihTR } from "@/lib/domain/edefterPlan";
import {
  EDefterTakipGrid,
  EDefterGridLejant,
  edefterSorumlu,
  hucreAnahtar,
  donemStr,
  type EDefterSatir,
} from "@/components/grid/EDefterTakipGrid";
import { EDefterTakipMobileCard } from "@/components/grid/EDefterTakipMobileCard";
import { cn } from "@/lib/utils/cn";
import type { EDefterTakip, EDefterPeriyot, EDefterDurum, Musteri } from "@/lib/types";

/** Mükellefin e-defter periyodu (null → sorumlu değil) */
function eDefterPeriyot(m: Musteri): EDefterPeriyot | null {
  const v = m.eDefter;
  if (!v) return null;
  if (v === "yuklu_3aylik") return "3aylik";
  if (v === "yuklu_aylik" || v === "yuklu") return "aylik";
  return null;
}

type PeriyotFiltre = "tumu" | EDefterPeriyot;

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

  const bugun = useMemo(() => new Date(), []);
  const [yil, setYil] = useState(bugun.getFullYear());
  const [aramaMetni, setAramaMetni] = useState("");
  const [periyotFiltre, setPeriyotFiltre] = useState<PeriyotFiltre>("tumu");
  // İyimser güncellemeler — anahtar: hucreAnahtar(musteriId, donem)
  const [override, setOverride] = useState<Record<string, EDefterDurum>>({});

  const plan = useMemo(() => edefterBeratPlani(bugun), [bugun]);
  const bugunYmd = useMemo(() => bugun.toISOString().slice(0, 10), [bugun]);

  // e-Defter yükümlüsü aktif mükellefler
  const tumSatirlar = useMemo<EDefterSatir[]>(
    () =>
      musteriler
        .filter((m) => m.durum === "aktif")
        .map((m) => ({ musteri: m, periyot: eDefterPeriyot(m) }))
        .filter((s): s is EDefterSatir => s.periyot !== null)
        .sort((a, b) => a.musteri.firmaAdi.localeCompare(b.musteri.firmaAdi, "tr")),
    [musteriler]
  );

  const satirlar = useMemo(() => {
    let liste = tumSatirlar;
    if (periyotFiltre !== "tumu") liste = liste.filter((s) => s.periyot === periyotFiltre);
    if (aramaMetni.trim()) {
      const aranan = aramaMetni.toLowerCase().trim();
      liste = liste.filter((s) => s.musteri.firmaAdi.toLowerCase().includes(aranan));
    }
    return liste;
  }, [tumSatirlar, periyotFiltre, aramaMetni]);

  /** Kayıtlı durum + iyimser override + son tarih → hücre durumu */
  const durumMap = useMemo(() => {
    const kayitli = new Map<string, EDefterDurum>();
    for (const k of takipler.data) {
      if (!k.donem.startsWith(`${yil}-`)) continue;
      kayitli.set(hucreAnahtar(k.musteriId, k.donem), k.durum);
    }
    const map = new Map<string, EDefterDurum>();
    for (const s of tumSatirlar) {
      for (let ay = 0; ay < 12; ay++) {
        if (!edefterSorumlu(s.periyot, ay)) continue;
        const donem = donemStr(yil, ay);
        const anahtar = hucreAnahtar(s.musteri.id, donem);
        const ham = override[anahtar] ?? kayitli.get(anahtar);
        if (ham === "gonderildi") {
          map.set(anahtar, "gonderildi");
          continue;
        }
        // Son tarih geçmiş ve gönderilmemiş → gecikti
        const sonTarih = edefterDonemSonTarihi(yil, ay, s.periyot === "aylik" ? "aylik" : "3aylik");
        map.set(anahtar, sonTarih && sonTarih < bugunYmd ? "gecikti" : "gonderilmedi");
      }
    }
    return map;
  }, [takipler.data, tumSatirlar, yil, override, bugunYmd]);

  const ozet = useMemo(() => {
    let toplam = 0;
    let gonderildi = 0;
    let gecikti = 0;
    for (const s of satirlar) {
      for (let ay = 0; ay < 12; ay++) {
        if (!edefterSorumlu(s.periyot, ay)) continue;
        toplam++;
        const d = durumMap.get(hucreAnahtar(s.musteri.id, donemStr(yil, ay)));
        if (d === "gonderildi") gonderildi++;
        else if (d === "gecikti") gecikti++;
      }
    }
    return { toplam, gonderildi, gecikti, bekleyen: toplam - gonderildi - gecikti };
  }, [satirlar, durumMap, yil]);

  const yuzde = ozet.toplam > 0 ? Math.round((ozet.gonderildi / ozet.toplam) * 100) : 0;

  const durumKaydet = useCallback(
    async (satir: EDefterSatir, donem: string, yeni: EDefterDurum) => {
      if (!user?.ofisId) return;
      const anahtar = hucreAnahtar(satir.musteri.id, donem);
      setOverride((prev) => ({ ...prev, [anahtar]: yeni }));
      try {
        const mevcut = takipler.data.find(
          (k) => k.musteriId === satir.musteri.id && k.donem === donem
        );
        const gonderimTarihi = yeni === "gonderildi" ? new Date().toISOString() : undefined;
        if (mevcut) {
          await updateEDefterTakip(mevcut.id, { durum: yeni, gonderimTarihi });
        } else {
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
          delete next[anahtar];
          return next;
        });
        toast.error("Durum güncellenemedi", err instanceof Error ? err.message : undefined);
      }
    },
    [user, takipler.data, toast]
  );

  const handleTopluDonem = useCallback(
    async (donemAy: number) => {
      const donem = donemStr(yil, donemAy);
      const hedefler = satirlar.filter(
        (s) =>
          edefterSorumlu(s.periyot, donemAy) &&
          durumMap.get(hucreAnahtar(s.musteri.id, donem)) !== "gonderildi"
      );
      if (hedefler.length === 0) {
        toast.warning("Gönderilmemiş kayıt yok");
        return;
      }
      for (const s of hedefler) {
        await durumKaydet(s, donem, "gonderildi");
      }
      toast.success("Toplu güncelleme", `${donem} — ${hedefler.length} mükellef gönderildi işaretlendi`);
      logAudit({
        action: "update",
        entityType: "edefter",
        entityId: donem,
        entityLabel: `${hedefler.length} mükellef`,
        summary: `E-Defter (${donem}): ${hedefler.length} mükellef gönderildi işaretlendi`,
      }).catch(() => undefined);
    },
    [yil, satirlar, durumMap, durumKaydet, toast, logAudit]
  );

  if (appLoading) return <PageLoading />;

  const ucAylikVar = tumSatirlar.some((s) => s.periyot === "3aylik");

  return (
    <div>
      <PageHeader
        title="E-Defter Takip"
        subtitle={`${tumSatirlar.length} yükümlü mükellef · ${yil} yılı`}
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "E-Defter Takip" }]}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setYil((y) => y - 1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Önceki yıl"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800 min-w-[60px] text-center">{yil}</span>
            <button
              type="button"
              onClick={() => setYil((y) => y + 1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Sonraki yıl"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <InfoBanner variant="info">
          Sütunlar <strong>dönemi</strong> gösterir, son yükleme tarihini değil. Bu ayın sonunda{" "}
          <strong>{plan.aylik.donemAdi}</strong> dönemi aylık beratları doluyor (son tarih{" "}
          {tarihTR(plan.aylik.sonTarih)})
          {plan.ucAylik ? (
            <>
              {" "}ve <strong>{plan.ucAylik.ceyrekAdi}</strong> 3 aylık beratları doluyor.
            </>
          ) : (
            "."
          )}
          {ucAylikVar && " 3 aylık mükelleflerin yalnızca çeyrek kapanış dönemleri (Mar · Haz · Eyl · Ara) doludur."}
        </InfoBanner>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <MetricCard title="Toplam Gönderim" value={String(ozet.toplam)} subtitle={`${yil} yılı`} />
        <MetricCard title="Gönderildi" value={String(ozet.gonderildi)} variant="success" subtitle={`%${yuzde}`} />
        <MetricCard title="Bekleyen" value={String(ozet.bekleyen)} variant="warning" />
        <MetricCard
          title="Geciken"
          value={String(ozet.gecikti)}
          variant="danger"
          subtitle="Son tarih geçti"
        />
      </div>

      {/* İlerleme */}
      {ozet.toplam > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{yil} Yılı İlerlemesi</span>
            <span className="text-sm font-semibold text-slate-800">
              %{yuzde}
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({ozet.gonderildi}/{ozet.toplam})
              </span>
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                yuzde === 100 ? "bg-emerald-500" : yuzde >= 50 ? "bg-blue-500" : yuzde >= 25 ? "bg-amber-400" : "bg-red-400"
              )}
              style={{ width: `${yuzde}%` }}
            />
          </div>
          {ozet.gecikti > 0 && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {ozet.gecikti} gönderimin son tarihi geçti
            </p>
          )}
        </div>
      )}

      {/* Arama + periyot filtresi */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Mükellef ara..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {aramaMetni && (
            <button
              type="button"
              onClick={() => setAramaMetni("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={periyotFiltre}
            onChange={(e) => setPeriyotFiltre(e.target.value as PeriyotFiltre)}
            className={cn(
              "text-sm rounded-lg border bg-white px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
              periyotFiltre !== "tumu" ? "border-blue-300 text-blue-800" : "border-slate-200"
            )}
          >
            <option value="tumu">Tüm Periyotlar</option>
            <option value="aylik">Aylık</option>
            <option value="3aylik">3 Aylık</option>
          </select>
        </div>
      </div>

      {(aramaMetni || periyotFiltre !== "tumu") && (
        <p className="text-xs text-slate-500 mb-3">
          {satirlar.length} mükellef bulundu
          {satirlar.length === 0 && " — filtreyi değiştirmeyi deneyin"}
        </p>
      )}

      {/* Masaüstü matris */}
      <div className="hidden md:block">
        <EDefterTakipGrid
          satirlar={satirlar}
          durumMap={durumMap}
          yil={yil}
          readOnly={!isStaff}
          onDurumDegistir={durumKaydet}
          onTopluDonem={isStaff ? handleTopluDonem : undefined}
        />
        <EDefterGridLejant />
      </div>

      {/* Mobil kartlar */}
      <div className="md:hidden space-y-3">
        {satirlar.length === 0 && tumSatirlar.length > 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            Filtreyle eşleşen mükellef bulunamadı
          </p>
        )}
        {satirlar.map((s) => (
          <EDefterTakipMobileCard
            key={s.musteri.id}
            satir={s}
            durumMap={durumMap}
            yil={yil}
            readOnly={!isStaff}
            onDurumDegistir={durumKaydet}
          />
        ))}
      </div>

      {tumSatirlar.length === 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <BookText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Henüz e-Defter yükümlüsü mükellef yok.
          <p className="mt-1 text-xs text-slate-400">
            Mükellef kartında <strong>e-Defter</strong> alanını &quot;Yüklü — Aylık&quot; veya &quot;Yüklü — 3 Aylık&quot; seçin.
          </p>
        </div>
      )}
    </div>
  );
}
