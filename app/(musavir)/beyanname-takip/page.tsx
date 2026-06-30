"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart3,
  Info,
} from "lucide-react";
import type { BeyanTakipDurum, BeyanTakipNotTur } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/PageLoading";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import { Badge } from "@/components/ui/Badge";
import { BeyanTakipGrid } from "@/components/grid/BeyanTakipGrid";
import { BeyanTakipMobileCard } from "@/components/grid/BeyanTakipMobileCard";
import { BeyanTakipNotModal } from "@/components/modals/BeyanTakipNotModal";
import { useAppData } from "@/lib/hooks/useAppData";
import { useBeyanTakipData } from "@/lib/hooks/useBeyanTakipData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import {
  gorunurKolonlar,
  hesaplaKalanIsler,
  hesaplaTakipIstatistik,
  geciciVergiUyarisi,
  beyanTakipHucreId,
} from "@/lib/domain/beyanTakip";
import { upsertBeyanTakipHucresi, createBeyanTakipNotu, deleteBeyanTakipNotu } from "@/lib/firebase/repositories";
import { formatTarih } from "@/lib/utils/format";

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function donemStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default function BeyannameTakipPage() {
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [notModalMusteri, setNotModalMusteri] = useState<string | null>(null);

  const donem = donemStr(year, month);
  const bugunDonem = donemStr(now.getFullYear(), now.getMonth());
  const gecmisDonemi = donem < bugunDonem;

  const { musteriler, loading: appLoading } = useAppData();
  const { hucreler, geciciNotlar, kaliciNotlar, loading: takipLoading } = useBeyanTakipData(donem, user?.ofisId);

  const loading = appLoading || takipLoading;

  function ayDegistir(delta: number) {
    let yeniAy = month + delta;
    let yeniYil = year;
    if (yeniAy < 0) { yeniAy = 11; yeniYil--; }
    if (yeniAy > 11) { yeniAy = 0; yeniYil++; }
    setMonth(yeniAy);
    setYear(yeniYil);
  }

  const kolonlar = useMemo(
    () => gorunurKolonlar(musteriler, donem),
    [musteriler, donem]
  );

  const istatistik = useMemo(
    () => hesaplaTakipIstatistik(musteriler, kolonlar, hucreler),
    [musteriler, kolonlar, hucreler]
  );

  const kalanIsler = useMemo(
    () => (gecmisDonemi ? [] : hesaplaKalanIsler(musteriler, kolonlar, hucreler, donem)),
    [musteriler, kolonlar, hucreler, donem, gecmisDonemi]
  );

  const geciciUyari = useMemo(() => geciciVergiUyarisi(donem), [donem]);

  const handleDurumDegistir = useCallback(
    async (musteriId: string, vergiTuruKey: string, durum: BeyanTakipDurum) => {
      if (!user?.ofisId) return;
      try {
        const id = beyanTakipHucreId(musteriId, vergiTuruKey, donem);
        await upsertBeyanTakipHucresi({
          id,
          ofisId: user.ofisId,
          musteriId,
          vergiTuruKey,
          donem,
          durum,
          guncellenmeTarihi: new Date().toISOString(),
          guncelleyenAd: user.ad ?? user.email,
        });
        await logAudit({
          action: "status_change",
          entityType: "beyanTakipHucresi",
          entityId: id,
          entityLabel: `${vergiTuruKey} — ${donem}`,
          summary: `Beyan takip durumu "${durum}" olarak güncellendi`,
          after: { durum },
        });
      } catch (err) {
        toast.error("Güncelleme başarısız", err instanceof Error ? err.message : undefined);
      }
    },
    [user, donem, logAudit, toast]
  );

  const handleNotEkle = useCallback(
    async (icerik: string, tur: BeyanTakipNotTur) => {
      if (!user?.ofisId || !notModalMusteri) return;
      try {
        await createBeyanTakipNotu({
          ofisId: user.ofisId,
          musteriId: notModalMusteri,
          donem,
          tur,
          icerik,
          createdBy: user.id,
          createdByName: user.ad ?? user.email,
        });
        toast.success("Not eklendi");
      } catch (err) {
        toast.error("Not eklenemedi", err instanceof Error ? err.message : undefined);
      }
    },
    [user, donem, notModalMusteri, toast]
  );

  const handleNotSil = useCallback(
    async (id: string) => {
      try {
        await deleteBeyanTakipNotu(id);
        toast.success("Not silindi");
      } catch (err) {
        toast.error("Not silinemedi", err instanceof Error ? err.message : undefined);
      }
    },
    [toast]
  );

  const tumNotlar = useMemo(() => [...geciciNotlar, ...kaliciNotlar], [geciciNotlar, kaliciNotlar]);

  const notModalMusteriObj = musteriler.find((m) => m.id === notModalMusteri);
  const notModalNotlar = geciciNotlar.filter(
    (n) => n.musteriId === notModalMusteri
  );
  const notModalKaliciNotlar = kaliciNotlar.filter(
    (n) => n.musteriId === notModalMusteri
  );

  const metrics = [
    {
      title: "Toplam İş",
      value: istatistik.toplam,
      subtitle: `${kolonlar.length} aktif sütun`,
      icon: <BarChart3 className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Tamamlanan",
      value: istatistik.tamamlanan,
      subtitle: istatistik.toplam > 0
        ? `%${Math.round((istatistik.tamamlanan / istatistik.toplam) * 100)}`
        : "—",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      variant: "success" as const,
    },
    {
      title: "Kalan",
      value: istatistik.kalan,
      subtitle: "Tamamlanmayı bekliyor",
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      variant: istatistik.kalan > 0 ? "warning" as const : "default" as const,
    },
    {
      title: "Sorunlu",
      value: istatistik.sorunlu,
      subtitle: "Dikkat gerektiriyor",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      variant: istatistik.sorunlu > 0 ? "danger" as const : "default" as const,
    },
  ];

  if (loading) return <PageLoading />;

  const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif");

  return (
    <div>
      <PageHeader
        title="Beyanname Takip"
        subtitle="Aylık beyanname durumlarını takip edin"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => ayDegistir(-1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800 min-w-[120px] text-center">
              {AY_ADLARI[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => ayDegistir(1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        }
      />

      {gecmisDonemi && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Geçmiş dönem görüntüleniyor ({AY_ADLARI[month]} {year}). Bu dönem salt okunurdur.
          </p>
        </div>
      )}

      <StatsDrawer
        title="Beyanname Takip Özeti"
        subtitle={`${AY_ADLARI[month]} ${year} dönemi`}
        metrics={metrics}
      />

      {/* Son tarih uyarıları */}
      {kalanIsler.length > 0 && (
        <div className="mb-4 space-y-2">
          {kalanIsler.map((u) => (
            <div
              key={u.kolon.key}
              className={`rounded-xl border px-4 py-3 flex items-center gap-2 ${
                u.sonTarihDurumu === "gecikti"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 flex-shrink-0 ${
                  u.sonTarihDurumu === "gecikti" ? "text-red-500" : "text-amber-500"
                }`}
              />
              <p
                className={`text-sm ${
                  u.sonTarihDurumu === "gecikti" ? "text-red-700" : "text-amber-700"
                }`}
              >
                <strong>{u.kolon.label}</strong>: {u.kalanFirma} firma kaldı
                {u.sonTarihDurumu === "gecikti"
                  ? ` — son tarih geçti! (${formatTarih(u.sonTarih.toISOString())})`
                  : ` — son tarih ${formatTarih(u.sonTarih.toISOString())}`}
              </p>
              <Badge variant={u.sonTarihDurumu === "gecikti" ? "danger" : "warning"}>
                {u.kalanFirma}/{u.toplamFirma}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Geçici vergi dönem uyarısı */}
      {geciciUyari && !gecmisDonemi && (
        <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <p className="text-sm text-purple-700">{geciciUyari}</p>
        </div>
      )}

      {/* Masaüstü grid */}
      <div className="hidden md:block">
        <BeyanTakipGrid
          musteriler={musteriler}
          kolonlar={kolonlar}
          hucreler={hucreler}
          notlar={tumNotlar}
          donem={donem}
          readOnly={gecmisDonemi}
          onDurumDegistir={handleDurumDegistir}
          onNotAc={setNotModalMusteri}
        />
      </div>

      {/* Mobil kartlar */}
      <div className="md:hidden space-y-3">
        {aktifMusteriler.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Aktif müşteri bulunamadı</p>
        )}
        {aktifMusteriler.map((m) => (
          <BeyanTakipMobileCard
            key={m.id}
            musteri={m}
            kolonlar={kolonlar}
            hucreler={hucreler.filter((h) => h.musteriId === m.id)}
            notlar={tumNotlar.filter((n) => n.musteriId === m.id)}
            readOnly={gecmisDonemi}
            onDurumDegistir={(vergiTuruKey, durum) => handleDurumDegistir(m.id, vergiTuruKey, durum)}
            onNotAc={() => setNotModalMusteri(m.id)}
          />
        ))}
      </div>

      {/* Not modal */}
      <BeyanTakipNotModal
        open={!!notModalMusteri}
        onClose={() => setNotModalMusteri(null)}
        musteriAdi={notModalMusteriObj?.firmaAdi ?? ""}
        donem={donem}
        notlar={notModalNotlar}
        kaliciNotlar={notModalKaliciNotlar}
        readOnly={gecmisDonemi}
        onNotEkle={handleNotEkle}
        onNotSil={handleNotSil}
      />
    </div>
  );
}
