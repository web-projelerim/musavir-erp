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
  Search,
  ArrowUpDown,
  Filter,
  CheckCheck,
  X,
} from "lucide-react";
import type { BeyanTakipDurum, BeyanTakipNotTur, BeyanTakipHucresi, Musteri } from "@/lib/types";
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
import { BEYAN_TAKIP_GRUP_LABELS } from "@/lib/data/beyanTakipKolonlari";
import { upsertBeyanTakipHucresi, patchBeyanTakipHucresi, createBeyanTakipNotu, deleteBeyanTakipNotu } from "@/lib/firebase/repositories";
import { formatTarih } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type SiralamaSecenegi = "isim" | "tamamlanma" | "sorunlu" | "kalan";

function donemStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function musteriTamamlanmaOrani(
  musteri: Musteri,
  kolonlar: { key: string }[],
  hucreMap: Map<string, BeyanTakipHucresi>
): { verildi: number; toplam: number; sorunlu: number } {
  let toplam = 0;
  let verildi = 0;
  let sorunlu = 0;
  for (const k of kolonlar) {
    if (musteri.vergiTurleri?.[k.key] !== "mukellef") continue;
    toplam++;
    const h = hucreMap.get(`${musteri.id}-${k.key}`);
    if (h?.durum === "tamamlandi" || h?.durum === "gonderildi") verildi++;
    if (h?.durum === "sorun") sorunlu++;
  }
  return { verildi, toplam, sorunlu };
}

export default function BeyannameTakipPage() {
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [notModalMusteri, setNotModalMusteri] = useState<string | null>(null);

  const [aramaMetni, setAramaMetni] = useState("");
  const [siralama, setSiralama] = useState<SiralamaSecenegi>("isim");
  const [aktifGrup, setAktifGrup] = useState<string | null>(null);
  const [topluIslemSutun, setTopluIslemSutun] = useState<string | null>(null);

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

  const tumKolonlar = useMemo(
    () => gorunurKolonlar(musteriler, donem),
    [musteriler, donem]
  );

  const kolonlar = useMemo(
    () => aktifGrup ? tumKolonlar.filter((k) => k.grup === aktifGrup) : tumKolonlar,
    [tumKolonlar, aktifGrup]
  );

  const mevcutGruplar = useMemo(() => {
    const grupSet = new Set(tumKolonlar.map((k) => k.grup));
    return Array.from(grupSet);
  }, [tumKolonlar]);

  const hucreMap = useMemo(() => {
    const map = new Map<string, BeyanTakipHucresi>();
    for (const h of hucreler) {
      map.set(`${h.musteriId}-${h.vergiTuruKey}`, h);
    }
    return map;
  }, [hucreler]);

  const istatistik = useMemo(
    () => hesaplaTakipIstatistik(musteriler, tumKolonlar, hucreler),
    [musteriler, tumKolonlar, hucreler]
  );

  const tamamlanmaYuzdesi = istatistik.toplam > 0
    ? Math.round((istatistik.tamamlanan / istatistik.toplam) * 100)
    : 0;

  const kalanIsler = useMemo(
    () => (gecmisDonemi ? [] : hesaplaKalanIsler(musteriler, tumKolonlar, hucreler, donem)),
    [musteriler, tumKolonlar, hucreler, donem, gecmisDonemi]
  );

  const geciciUyari = useMemo(() => geciciVergiUyarisi(donem), [donem]);

  const aktifMusteriler = useMemo(() => {
    let liste = musteriler.filter((m) => m.durum === "aktif");

    if (aramaMetni.trim()) {
      const aranan = aramaMetni.toLowerCase().trim();
      liste = liste.filter(
        (m) =>
          m.firmaAdi.toLowerCase().includes(aranan) ||
          m.vknTckn.includes(aranan) ||
          (m.yetkiliAd && m.yetkiliAd.toLowerCase().includes(aranan))
      );
    }

    liste.sort((a, b) => {
      if (siralama === "isim") {
        return a.firmaAdi.localeCompare(b.firmaAdi, "tr");
      }
      const oranA = musteriTamamlanmaOrani(a, kolonlar, hucreMap);
      const oranB = musteriTamamlanmaOrani(b, kolonlar, hucreMap);
      if (siralama === "tamamlanma") {
        const yuzdeA = oranA.toplam > 0 ? oranA.verildi / oranA.toplam : 0;
        const yuzdeB = oranB.toplam > 0 ? oranB.verildi / oranB.toplam : 0;
        return yuzdeA - yuzdeB;
      }
      if (siralama === "sorunlu") {
        return oranB.sorunlu - oranA.sorunlu;
      }
      if (siralama === "kalan") {
        const kalanA = oranA.toplam - oranA.verildi;
        const kalanB = oranB.toplam - oranB.verildi;
        return kalanB - kalanA;
      }
      return 0;
    });

    return liste;
  }, [musteriler, aramaMetni, siralama, kolonlar, hucreMap]);

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

  // Tahakkuk (T) işareti — durum (B) alanına dokunmadan aynı dokümana merge ile yazılır.
  const handleTahakkukDegistir = useCallback(
    async (musteriId: string, vergiTuruKey: string, yapildi: boolean) => {
      if (!user?.ofisId) return;
      try {
        const id = beyanTakipHucreId(musteriId, vergiTuruKey, donem);
        await patchBeyanTakipHucresi({
          id,
          ofisId: user.ofisId,
          musteriId,
          vergiTuruKey,
          donem,
          tahakkukYapildi: yapildi,
          guncellenmeTarihi: new Date().toISOString(),
          guncelleyenAd: user.ad ?? user.email,
        });
        await logAudit({
          action: "status_change",
          entityType: "beyanTakipHucresi",
          entityId: id,
          entityLabel: `${vergiTuruKey} — ${donem}`,
          summary: `Tahakkuk ${yapildi ? "yapıldı olarak işaretlendi" : "geri alındı"}`,
          after: { tahakkukYapildi: yapildi },
        });
      } catch (err) {
        toast.error("Güncelleme başarısız", err instanceof Error ? err.message : undefined);
      }
    },
    [user, donem, logAudit, toast]
  );

  const handleTopluTamamla = useCallback(
    async (vergiTuruKey: string) => {
      if (!user?.ofisId) return;
      const ilgiliMusteriler = aktifMusteriler.filter(
        (m) => m.vergiTurleri?.[vergiTuruKey] === "mukellef"
      );
      let basarili = 0;
      for (const m of ilgiliMusteriler) {
        const mevcut = hucreMap.get(`${m.id}-${vergiTuruKey}`);
        if (mevcut?.durum === "tamamlandi" || mevcut?.durum === "gonderildi") continue;
        try {
          const id = beyanTakipHucreId(m.id, vergiTuruKey, donem);
          await upsertBeyanTakipHucresi({
            id,
            ofisId: user.ofisId,
            musteriId: m.id,
            vergiTuruKey,
            donem,
            durum: "tamamlandi",
            guncellenmeTarihi: new Date().toISOString(),
            guncelleyenAd: user.ad ?? user.email,
          });
          basarili++;
        } catch {
          // devam et
        }
      }
      if (basarili > 0) {
        toast.success("Toplu güncelleme", `${basarili} müşteri tamamlandı olarak işaretlendi`);
        await logAudit({
          action: "status_change",
          entityType: "beyanTakipHucresi",
          entityId: vergiTuruKey,
          entityLabel: `${vergiTuruKey} — ${donem} (toplu)`,
          summary: `${basarili} müşteri toplu olarak "tamamlandi" yapıldı`,
          after: { durum: "tamamlandi", adet: basarili },
        });
      }
      setTopluIslemSutun(null);
    },
    [user, donem, aktifMusteriler, hucreMap, logAudit, toast]
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
      subtitle: `${tumKolonlar.length} aktif sütun`,
      icon: <BarChart3 className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Tamamlanan",
      value: istatistik.tamamlanan,
      subtitle: istatistik.toplam > 0
        ? `%${tamamlanmaYuzdesi}`
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

      {/* İlerleme çubuğu */}
      {istatistik.toplam > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Genel İlerleme</span>
            <span className="text-sm font-semibold text-slate-800">
              %{tamamlanmaYuzdesi}
              <span className="text-xs font-normal text-slate-400 ml-1">
                ({istatistik.tamamlanan}/{istatistik.toplam})
              </span>
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                tamamlanmaYuzdesi === 100
                  ? "bg-emerald-500"
                  : tamamlanmaYuzdesi >= 75
                  ? "bg-emerald-400"
                  : tamamlanmaYuzdesi >= 50
                  ? "bg-blue-500"
                  : tamamlanmaYuzdesi >= 25
                  ? "bg-amber-400"
                  : "bg-red-400"
              )}
              style={{ width: `${tamamlanmaYuzdesi}%` }}
            />
          </div>
          {istatistik.sorunlu > 0 && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {istatistik.sorunlu} sorunlu beyanname dikkat bekliyor
            </p>
          )}
        </div>
      )}

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
                className={`text-sm flex-1 ${
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

      {/* Arama, Sıralama ve Filtre Çubuğu */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Arama */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
            placeholder="Müşteri ara (ad, VKN, yetkili)..."
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

        {/* Sıralama */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={siralama}
            onChange={(e) => setSiralama(e.target.value as SiralamaSecenegi)}
            className="text-sm rounded-lg border border-slate-200 bg-white px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="isim">İsme Göre</option>
            <option value="tamamlanma">Tamamlanma (Az→Çok)</option>
            <option value="kalan">Kalan İş (Çok→Az)</option>
            <option value="sorunlu">Sorunlu Önce</option>
          </select>
        </div>

        {/* Grup Filtre */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <button
            type="button"
            onClick={() => setAktifGrup(null)}
            className={cn(
              "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              !aktifGrup
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            Tümü
          </button>
          {mevcutGruplar.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setAktifGrup(aktifGrup === g ? null : g)}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                aktifGrup === g
                  ? "bg-blue-100 border-blue-300 text-blue-800"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {BEYAN_TAKIP_GRUP_LABELS[g] ?? g}
            </button>
          ))}
        </div>
      </div>

      {/* Arama sonuç bilgisi */}
      {aramaMetni && (
        <p className="text-xs text-slate-500 mb-3">
          {aktifMusteriler.length} müşteri bulundu
          {aktifMusteriler.length === 0 && " — aramayı değiştirmeyi deneyin"}
        </p>
      )}

      {/* Toplu İşlem Onay */}
      {topluIslemSutun && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
          <CheckCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800 flex-1">
            <strong>{tumKolonlar.find((k) => k.key === topluIslemSutun)?.label}</strong> sütunundaki
            tüm eksik müşteriler &quot;Tamamlandı&quot; olarak işaretlenecek. Emin misiniz?
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setTopluIslemSutun(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => handleTopluTamamla(topluIslemSutun)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Onayla
            </button>
          </div>
        </div>
      )}

      {/* Masaüstü grid */}
      <div className="hidden md:block">
        <BeyanTakipGrid
          musteriler={aktifMusteriler}
          kolonlar={kolonlar}
          hucreler={hucreler}
          notlar={tumNotlar}
          donem={donem}
          readOnly={gecmisDonemi}
          onDurumDegistir={handleDurumDegistir}
          onTahakkukDegistir={handleTahakkukDegistir}
          onNotAc={setNotModalMusteri}
          onTopluIslem={gecmisDonemi ? undefined : setTopluIslemSutun}
          preFilteredAktif
        />

        {/* Renk / işaret açıklaması */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-card">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-emerald-600" />
            Beyan Edilmiş
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-400" />
            Beyan Edilmemiş
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-400" />
            İşlemde
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200" />
            Sorumlu Değil
          </span>
          <span className="ml-auto flex items-center gap-3 text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">B</span>
              Beyanname
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">T</span>
              Tahakkuk
            </span>
          </span>
        </div>
      </div>

      {/* Mobil kartlar */}
      <div className="md:hidden space-y-3">
        {aktifMusteriler.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            {aramaMetni ? "Aramayla eşleşen müşteri bulunamadı" : "Aktif müşteri bulunamadı"}
          </p>
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
            onTahakkukDegistir={(vergiTuruKey, yapildi) => handleTahakkukDegistir(m.id, vergiTuruKey, yapildi)}
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
