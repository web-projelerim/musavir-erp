"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResmiGazeteOzeti } from "@/lib/types";
import {
  Users,
  AlertTriangle,
  CheckSquare,
  Bell,
  FileText,
  Clock,
  Calendar,
  ArrowRight,
  Plus,
  MessageCircle,
  Sparkles,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  Newspaper,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InfoBanner } from "@/components/ui/InfoBanner";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import { Badge, RiskBadge, BeyannameBadge, TahsilatBadge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { hesaplaRiskListesi } from "@/lib/domain/risk";
import { useAppData } from "@/lib/hooks/useAppData";
import { beyannameTakipDurumu, beyannameTakipOzeti } from "@/lib/domain/beyannameTakip";
import { useAuth } from "@/lib/context/AuthContext";
import { displayVknTckn } from "@/lib/utils/maskData";
import { PageLoading } from "@/components/ui/PageLoading";
import { MiniTakvim } from "@/components/ui/MiniTakvim";
import type { TakvimOlay } from "@/components/ui/MiniTakvim";
import { getVergiTakvimiIkiYil } from "@/lib/data/vergiTakvimi";
import { formatTarih } from "@/lib/utils/format";
import { authHeaders } from "@/lib/firebase/client";
import Link from "next/link";

const ONCELIK_LABEL: Record<string, string> = {
  dusuk: "Düşük",
  normal: "Normal",
  yuksek: "Yüksek",
  kritik: "Kritik",
};

const BEYAN_TUR_LABEL: Record<string, string> = {
  KDV: "KDV", MUHTAS: "Muhtasar", KURUM: "Kurumlar", GELIR: "Gelir", GECICI: "Geçici", DIGER: "Diğer",
};

const SYNC_TIPI_LABEL: Record<string, string> = {
  tebligat: "Tebligat",
  beyanname: "Beyanname",
  tahakkuk: "Tahakkuk",
  borc: "Borç",
  mukellef: "Mükellef",
  pdf: "PDF",
  tumu: "Tümü",
};

const SYNC_DURUM_LABEL: Record<string, string> = {
  basarili: "Başarılı",
  basarisiz: "Başarısız",
  bekliyor: "Bekliyor",
};

const RISK_RENKLER = {
  dusuk: { name: "Düşük", color: "#10b981" },
  orta: { name: "Orta", color: "#f59e0b" },
  yuksek: { name: "Yüksek", color: "#f97316" },
  kritik: { name: "Kritik", color: "#ef4444" },
} as const;

const AY_ADLARI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** Risk skoruna göre kırmızı tonu + opsiyonel yanıp-sönen animasyon */
function riskTonu(skor: number): { bg: string; border: string; text: string; pulse: string } {
  if (skor >= 90) return { bg: "bg-red-200", border: "border-red-400", text: "text-red-900", pulse: "animate-pulse" };
  if (skor >= 80) return { bg: "bg-red-100", border: "border-red-300", text: "text-red-900", pulse: "" };
  if (skor >= 70) return { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", pulse: "" };
  if (skor >= 60) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", pulse: "" };
  if (skor >= 50) return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", pulse: "" };
  return { bg: "", border: "", text: "text-slate-800", pulse: "" };
}

function ayKey(tarih: string) {
  const date = new Date(tarih);
  if (Number.isNaN(date.getTime())) return tarih.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ayLabel(key: string) {
  const [, month] = key.split("-");
  const index = Number(month) - 1;
  return AY_ADLARI[index] ?? key;
}

export default function DashboardPage() {
  const [showGorevModal, setShowGorevModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [dismissedGazete, setDismissedGazete] = useState<string[]>([]);
  const [gazeteDynamic, setGazeteDynamic] = useState<ResmiGazeteOzeti[]>([]);
  const [gazeteYukleniyor, setGazeteYukleniyor] = useState(false);
  const [gazeteHata, setGazeteHata] = useState(false);
  const [gazeteYeniIdler, setGazeteYeniIdler] = useState<string[]>([]);
  const [duyurularAcik, setDuyurularAcik] = useState(true);
  const [aktifDuyuruSekme, setAktifDuyuruSekme] = useState<"turmob" | "gazete">("gazete");
  const [turmobHaberler, setTurmobHaberler] = useState<Array<{ baslik: string; link: string; tarih: string; ozet: string }>>([]);
  const [turmobYukleniyor, setTurmobYukleniyor] = useState(false);
  const [turmobHata, setTurmobHata] = useState(false);
  const [turmobYeniLinkler, setTurmobYeniLinkler] = useState<string[]>([]);
  const [gibTakvimOlaylari, setGibTakvimOlaylari] = useState<Array<{ tarih: string; baslik: string; aciklama: string }>>([]);
  const { musteriler, gorevler, tebligatlar, beyannameler, raporlar, tahsilatlar, tahakkuklar, kdv2, resmiGazeteOzetleri, gibSyncLogs, gonderimler, loading } = useAppData();
  const { user } = useAuth();

  useEffect(() => {
    const bugun = new Date().toISOString().slice(0, 10);
    const LAST_KEY = "gazete_last";
    const FETCH_FLAG = `gazete_fetched_${bugun}`; // pahalı AI çağrısını günde 1 kez sınırla

    let onceki: ResmiGazeteOzeti[] = [];
    try {
      const cached = localStorage.getItem(LAST_KEY);
      if (cached) {
        onceki = JSON.parse(cached) as ResmiGazeteOzeti[];
        if (onceki.length > 0) setGazeteDynamic(onceki); // en son içeriği hemen göster
      }
    } catch {}

    // Bugün zaten çekildiyse tekrar AI çağrısı yapma — en son içerik gösteriliyor
    if (onceki.length > 0) {
      try { if (localStorage.getItem(FETCH_FLAG)) return; } catch {}
    }
    const oncekiIdler = new Set(onceki.map((d) => d.kaynakLink || d.baslik));

    setGazeteYukleniyor(true);
    // Kaynak (Resmi Gazete) yavaş/erişilemez olabilir — spinner asla takılı
    // kalmasın diye istemci tarafında da zaman aşımı uygula.
    const gazeteTimeout = AbortSignal.timeout(18_000);
    void (async () => {
      const headers = await authHeaders();
      return fetch("/api/resmi-gazete/ozetle", { method: "POST", headers, signal: gazeteTimeout });
    })()
      .then((r) => (r.ok ? r.json() : r.json().then((d) => { if (!d?.ok) return null; return d; })))
      .then((data: { ok: boolean; maddeler?: Array<{ baslik: string; aiOzet: string; maliMusavirEtkisi: string; aksiyonGerekiyor: boolean; maliMusavirEtkiPuani: number; kaynakLink: string; yayinTarihi: string }> } | null) => {
        if (!data || !data.ok) {
          if (onceki.length === 0) setGazeteHata(true); // yalnızca hiç cache yoksa hata
          return;
        }
        if (data.ok && Array.isArray(data.maddeler) && data.maddeler.length > 0) {
          const items: ResmiGazeteOzeti[] = data.maddeler.map((m, i) => ({
            id: `gazete-dynamic-${bugun}-${i}`,
            ofisId: "",
            yayinTarihi: m.yayinTarihi,
            baslik: m.baslik,
            kaynakLink: m.kaynakLink,
            kategori: "vergi",
            aiOzet: m.aiOzet,
            maliMusavirEtkisi: m.maliMusavirEtkisi,
            aksiyonGerekiyor: m.aksiyonGerekiyor,
            maliMusavirEtkiPuani: m.maliMusavirEtkiPuani,
            durum: "yeni" as const,
            createdAt: new Date().toISOString(),
          }));
          setGazeteDynamic(items);
          // Öncekinde olmayan madde = yeni (kaynak linki/başlığı bazında)
          const yeni = onceki.length > 0
            ? items.filter((it) => !oncekiIdler.has(it.kaynakLink || it.baslik)).map((it) => it.kaynakLink || it.baslik)
            : [];
          setGazeteYeniIdler(yeni);
          setGazeteHata(false);
          try {
            localStorage.setItem(LAST_KEY, JSON.stringify(items));
            localStorage.setItem(FETCH_FLAG, "1");
          } catch {}
        }
      })
      .catch(() => { if (onceki.length === 0) setGazeteHata(true); })
      .finally(() => setGazeteYukleniyor(false));
  }, []);

  // TÜRMOB haber feed'i — en son içerik kalıcı saklanır (panel asla boşalmaz),
  // yeni gelen haberler "Yeni" olarak işaretlenir.
  useEffect(() => {
    const LAST_KEY = "turmob_last";
    let onceki: Array<{ baslik: string; link: string; tarih: string; ozet: string }> = [];
    try {
      const cached = localStorage.getItem(LAST_KEY);
      if (cached) {
        onceki = JSON.parse(cached);
        if (onceki.length > 0) setTurmobHaberler(onceki); // en son içeriği hemen göster
      }
    } catch {}
    const oncekiLinkler = new Set(onceki.map((h) => h.link));

    setTurmobYukleniyor(true);
    void (async () => {
      const headers = await authHeaders();
      return fetch("/api/turmob/duyurular", { headers, signal: AbortSignal.timeout(16_000) });
    })()
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok: boolean; haberler?: Array<{ baslik: string; link: string; tarih: string; ozet: string }> } | null) => {
        if (data?.ok && Array.isArray(data.haberler) && data.haberler.length > 0) {
          const haberler = data.haberler;
          // Öncekinde olmayan link = yeni (ilk yüklemede hiçbir şey "yeni" sayılmaz)
          const yeni = onceki.length > 0 ? haberler.filter((h) => !oncekiLinkler.has(h.link)).map((h) => h.link) : [];
          setTurmobHaberler(haberler);
          setTurmobYeniLinkler(yeni);
          setTurmobHata(false);
          try { localStorage.setItem(LAST_KEY, JSON.stringify(haberler)); } catch {}
        } else if (onceki.length === 0) {
          setTurmobHata(true); // yalnızca hiç cache yoksa hata göster
        }
      })
      .catch(() => { if (onceki.length === 0) setTurmobHata(true); })
      .finally(() => setTurmobYukleniyor(false));
  }, []);

  // GİB resmi vergi takvimi — yıl bazlı cache (24 saat)
  useEffect(() => {
    const yil = new Date().getFullYear();
    const cacheKey = `gib_takvim_${yil}`;
    const cacheTsKey = `gib_takvim_${yil}_ts`;
    try {
      const cached = localStorage.getItem(cacheKey);
      const ts = Number(localStorage.getItem(cacheTsKey) ?? 0);
      const yas = Date.now() - ts;
      if (cached && yas < 24 * 60 * 60 * 1000) {
        setGibTakvimOlaylari(JSON.parse(cached));
        return;
      }
    } catch {}

    void (async () => {
      const headers = await authHeaders();
      // Önce Firestore cache'i dene (cron'un yazdığı, ucuz okuma)
      const getRes = await fetch(`/api/vergi-takvimi/sync?yil=${yil}`, { method: "GET", headers });
      const getData = await getRes.json().catch(() => null) as
        | { ok: boolean; olaylar?: Array<{ tarih: string; baslik: string; aciklama: string }> }
        | null;
      if (getData?.ok && Array.isArray(getData.olaylar) && getData.olaylar.length > 0) {
        return getData;
      }
      // Firestore boşsa → canlı GİB sync (Gemini çağrısı)
      const postRes = await fetch(`/api/vergi-takvimi/sync?yil=${yil}`, { method: "POST", headers });
      return postRes.json();
    })()
      .then((data: { ok: boolean; olaylar?: Array<{ tarih: string; baslik: string; aciklama: string }> } | null) => {
        if (data?.ok && Array.isArray(data.olaylar) && data.olaylar.length > 0) {
          setGibTakvimOlaylari(data.olaylar);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data.olaylar));
            localStorage.setItem(cacheTsKey, String(Date.now()));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const bekleyenGorevler = gorevler.filter(
    (g) => g.durum !== "tamamlandi" && g.durum !== "iptal"
  );
  const yeniTebligatlar = tebligatlar.filter((t) => t.durum === "yeni");
  // "Yaklaşan": son tarihi yaklaşan veya geçmiş (aksiyon gerektiren) bekleyen
  // beyannameler — verilmiş/iptal hariç, gerçek tarih değerlendirmesiyle.
  const beyanTakipOzeti = beyannameTakipOzeti(beyannameler);
  const yaklasanBeyanlar = beyannameler.filter((b) => {
    const d = beyannameTakipDurumu(b);
    return d === "yaklasan" || d === "gecikti";
  });
  const hazirRaporlar = raporlar.filter((r) => r.durum === "hazir");
  const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif");

  // E-Defter & POS hatırlatmaları (§2.3 / §4)
  const _bugun = new Date();
  const _ayinSonGunu = new Date(_bugun.getFullYear(), _bugun.getMonth() + 1, 0).getDate();
  const _sonBesGun = _bugun.getDate() > _ayinSonGunu - 5;
  const _ceyrekSonu = [3, 6, 9, 12].includes(_bugun.getMonth() + 1);
  const edefterAylikSayi = aktifMusteriler.filter(
    (m) => m.eDefter === "yuklu_aylik" || m.eDefter === "yuklu"
  ).length;
  const edefter3AylikSayi = aktifMusteriler.filter((m) => m.eDefter === "yuklu_3aylik").length;
  const fizikselPosSayi = aktifMusteriler.filter((m) => m.posTuru?.includes("fiziksel_pos")).length;
  const edefterAylikUyari = _sonBesGun && edefterAylikSayi > 0;
  const edefter3AylikUyari = _sonBesGun && _ceyrekSonu && edefter3AylikSayi > 0;
  const riskListesi = hesaplaRiskListesi({ musteriler: aktifMusteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, tahakkuklar, kdv2 });
  const kritikRiskler = riskListesi.filter(
    (risk) => risk.seviye === "kritik" || risk.seviye === "yuksek"
  );

  const riskDagilim = (Object.keys(RISK_RENKLER) as Array<keyof typeof RISK_RENKLER>).map((key) => ({
    name: RISK_RENKLER[key].name,
    value: riskListesi.filter((risk) => risk.seviye === key).length,
    color: RISK_RENKLER[key].color,
  }));

  const beyanOzet = Object.values(
    beyannameler.reduce<Record<string, { donem: string; sortKey: string; verildi: number; bekliyor: number; gecikti: number }>>(
      (acc, beyan) => {
        const key = ayKey(beyan.sonTarih);
        acc[key] ??= { donem: ayLabel(key), sortKey: key, verildi: 0, bekliyor: 0, gecikti: 0 };
        if (beyan.durum === "verildi") acc[key].verildi += 1;
        if (beyan.durum === "bekliyor") acc[key].bekliyor += 1;
        if (beyan.durum === "gecikti") acc[key].gecikti += 1;
        return acc;
      },
      {}
    )
  ).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-4);


  const metrics = [
    {
      title: "Toplam Mükellef",
      value: musteriler.filter((m) => m.durum === "aktif").length,
      subtitle: `${musteriler.length} toplam kayıt`,
      icon: <Users className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Kritik & Yüksek Risk",
      value: kritikRiskler.length,
      subtitle: "Acil müdahale",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      variant: kritikRiskler.length > 0 ? "danger" as const : "default" as const,
    },
    {
      title: "Bekleyen Görevler",
      value: bekleyenGorevler.length,
      subtitle: `${bekleyenGorevler.filter((g) => g.oncelik === "kritik").length} kritik`,
      icon: <CheckSquare className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Yeni Tebligatlar",
      value: yeniTebligatlar.length,
      subtitle: "İşlem bekliyor",
      icon: <Bell className="w-5 h-5 text-amber-500" />,
      variant: yeniTebligatlar.length > 0 ? "warning" as const : "default" as const,
    },
    {
      title: "Yaklaşan Beyanlar",
      value: yaklasanBeyanlar.length,
      subtitle: beyanTakipOzeti.gecikenSayisi > 0 ? `${beyanTakipOzeti.gecikenSayisi} geciken` : "Son tarih yakın",
      icon: <Calendar className="w-5 h-5" />,
      variant: beyanTakipOzeti.gecikenSayisi > 0 ? ("danger" as const) : ("default" as const),
    },
    {
      title: "Hazır Raporlar",
      value: hazirRaporlar.length,
      subtitle: "Gönderim bekliyor",
      icon: <FileText className="w-5 h-5" />,
      variant: "default" as const,
    },
  ];

  const visibleGazete = useMemo(() => {
    const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dinamikIdsSet = new Set(gazeteDynamic.map((d) => d.id));
    const firestoreFiltered = resmiGazeteOzetleri.filter(
      (item) => !dinamikIdsSet.has(item.id) && item.yayinTarihi.slice(0, 10) >= yediGunOnce
    );
    return [...gazeteDynamic, ...firestoreFiltered]
      .sort((a, b) => b.yayinTarihi.localeCompare(a.yayinTarihi))
      .filter((item) => !dismissedGazete.includes(item.id) && item.maliMusavirEtkiPuani >= 30)
      .slice(0, 4);
  }, [dismissedGazete, resmiGazeteOzetleri, gazeteDynamic]);

  const takvimOlaylari = useMemo<TakvimOlay[]>(() => {
    const olaylar: TakvimOlay[] = [];

    // GİB vergi takvimi — canlı GİB sync verisi TEK kaynaktır (izleyen ayın 28'i
    // KDV, ertelemeler vb. anlık günceldir). Statik liste yalnızca canlı veri
    // hiç yoksa (Gemini anahtarı yok / GİB erişilemez / offline) devreye giren
    // yedektir. İkisi ASLA birleştirilmez; birleştirilirse statik yanlış tarih
    // (ör. KDV 26) canlı doğru tarihin (28) yanında mükerrer görünür.
    const vergiKaynak =
      gibTakvimOlaylari.length > 0 ? gibTakvimOlaylari : getVergiTakvimiIkiYil();
    for (const v of vergiKaynak) {
      // e-Defter berat tarihleri yeşil (emerald) — vergi tarihlerinden ayrışsın (§8)
      const eDefterMi = v.baslik.toLowerCase().includes("e-defter");
      olaylar.push({
        tarih: v.tarih,
        renk: eDefterMi ? "emerald" : "purple",
        etiket: v.baslik,
        tur: eDefterMi ? "edefter" : "vergi",
        aciklama: v.aciklama,
      });
    }

    for (const b of beyannameler.filter((b) => b.durum === "bekliyor" || b.durum === "gecikti")) {
      olaylar.push({
        tarih: b.sonTarih,
        renk: b.durum === "gecikti" ? "red" : "amber",
        etiket: `${b.musteriAdi} — ${b.tur} beyanname`,
        href: "/beyannameler",
        tur: "beyanname",
        durum: b.durum,
      });
    }
    for (const g of gorevler.filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal")) {
      olaylar.push({
        tarih: g.terminTarihi,
        renk: "blue",
        etiket: `${g.musteriAdi} — ${g.baslik}`,
        href: "/gorevler",
        tur: "gorev",
        durum: g.durum,
      });
    }
    for (const t of tahsilatlar.filter((t) => t.durum === "bekliyor" || t.durum === "gecikti")) {
      olaylar.push({
        tarih: t.vadeTarihi,
        renk: "amber",
        etiket: `${t.musteriAdi ?? "Tahsilat"} — ₺${t.tutar.toLocaleString("tr-TR")}`,
        href: "/tahakkuklar",
        tur: "tahsilat",
        durum: t.durum,
      });
    }
    return olaylar;
  }, [beyannameler, gorevler, tahsilatlar, gibTakvimOlaylari]);

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${user ? `Merhaba ${user.ad}, bugün ` : ""}${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              icon={<MessageCircle className="w-3.5 h-3.5" />}
              onClick={() => setShowWaModal(true)}
              className="min-w-0 whitespace-nowrap"
            >
              WhatsApp Gönder
            </Button>
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowGorevModal(true)}
              className="min-w-0 whitespace-nowrap"
            >
              Yeni Görev
            </Button>
          </div>
        }
      />

      {(edefterAylikUyari || edefter3AylikUyari || fizikselPosSayi > 0) && (
        <div className="mb-5 space-y-2">
          {edefterAylikUyari && (
            <InfoBanner variant="warning">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Ay sonu yaklaşıyor:</strong> {edefterAylikSayi} mükellefin aylık e-defter berat gönderimi var.
                </span>
                <Link href="/edefter" className="font-medium text-amber-800 hover:underline whitespace-nowrap">
                  E-Defter Takip →
                </Link>
              </div>
            </InfoBanner>
          )}
          {edefter3AylikUyari && (
            <InfoBanner variant="warning">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Çeyrek sonu:</strong> {edefter3AylikSayi} mükellefin 3 aylık e-defter berat gönderimi var.
                </span>
                <Link href="/edefter" className="font-medium text-amber-800 hover:underline whitespace-nowrap">
                  E-Defter Takip →
                </Link>
              </div>
            </InfoBanner>
          )}
          {fizikselPosSayi > 0 && (
            <InfoBanner variant="info">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Z Raporu:</strong> {fizikselPosSayi} mükellefin fiziksel POS&apos;u var — bu ayın Z raporlarını kontrol edin.
                </span>
                <Link href="/pos-takip" className="font-medium text-blue-700 hover:underline whitespace-nowrap">
                  POS / Z Raporu →
                </Link>
              </div>
            </InfoBanner>
          )}
        </div>
      )}

      <StatsDrawer
        title="Dashboard İstatistikleri"
        subtitle="Portföy, görev, tebligat ve rapor özeti"
        metrics={metrics}
      />

      {/* Hızlı Erişim — mini özet + doğrudan ilgili sayfaya giden buton.
          Kartlar eşit yükseklikte (h-full) ve butonlar alt hizada (mt-auto) durur. */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col h-full">
          <div className="flex items-center gap-2 text-slate-800">
            <Users className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Mükellef Portföyü</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{aktifMusteriler.length}</p>
          <p className="text-xs text-slate-500">{musteriler.length} toplam kayıttan aktif</p>
          <Link href="/musteriler" className="mt-auto pt-3 block">
            <Button variant="outline" size="sm" className="w-full justify-center">
              Mükelleflere Git
            </Button>
          </Link>
        </Card>
        <Card className={`flex flex-col h-full ${kritikRiskler.length > 0 ? "border-red-200 bg-red-50" : ""}`}>
          <div className="flex items-center gap-2 text-slate-800">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">Risk Durumu</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{kritikRiskler.length}</p>
          <p className="text-xs text-slate-500">Kritik &amp; yüksek riskli mükellef</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="danger" size="sm">
              Kritik: {riskListesi.filter((r) => r.seviye === "kritik").length}
            </Badge>
            <Badge variant="warning" size="sm">
              Yüksek: {riskListesi.filter((r) => r.seviye === "yuksek").length}
            </Badge>
          </div>
          <Link href="/risk" className="mt-auto pt-3 block">
            <Button variant="outline" size="sm" className="w-full justify-center">
              Risk Ekranına Git
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col h-full">
          <div className="flex items-center gap-2 text-slate-800">
            <Bell className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Tebligat Durumu</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{yeniTebligatlar.length}</p>
          <p className="text-xs text-slate-500">{tebligatlar.length} toplam kayıttan yeni</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {yeniTebligatlar.length > 0 && (
              <Badge variant="danger" size="sm">Yeni: {yeniTebligatlar.length}</Badge>
            )}
            <Badge variant="neutral" size="sm">
              Okundu: {tebligatlar.filter((t) => t.durum === "okundu").length}
            </Badge>
            <Badge variant="neutral" size="sm">
              İşlendi: {tebligatlar.filter((t) => t.durum === "islendi").length}
            </Badge>
          </div>
          <Link href="/tebligatlar" className="mt-auto pt-3 block">
            <Button variant="outline" size="sm" className="w-full justify-center">
              Tebligatlara Git
            </Button>
          </Link>
        </Card>
        <Card className="flex flex-col h-full">
          <div className="flex items-center gap-2 text-slate-800">
            <Send className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold">Onay Bekleyen İşlemler</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {gonderimler.filter((g) => g.durum === "bekliyor").length}
          </p>
          <p className="text-xs text-slate-500">Gönderim onayı bekliyor</p>
          {gonderimler.filter((g) => g.durum === "basarisiz").length > 0 && (
            <p className="mt-1 text-xs font-medium text-red-600">
              Başarısız: {gonderimler.filter((g) => g.durum === "basarisiz").length}
            </p>
          )}
          <Link href="/onay-bekleyenler" className="mt-auto pt-3 block">
            <Button variant="outline" size="sm" className="w-full justify-center">
              Onay Bekleyenlere Git
            </Button>
          </Link>
        </Card>
      </div>

      {/* Takvim — full-width, dashboard'a girince ilk görünen */}
      <div className="mb-6">
        <MiniTakvim olaylar={takvimOlaylari} />
      </div>

      {/* Güncel Duyurular — TÜRMOB haberleri + Resmi Gazete mali maddeleri.
          İki sekmeli kompakt accordion; varsayılan açık gelir. */}
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {/* Panel başlığı */}
        <button
          type="button"
          onClick={() => setDuyurularAcik((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
          aria-expanded={duyurularAcik}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Newspaper className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
            <span className="text-xs font-semibold text-slate-700">Güncel Duyurular</span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">TÜRMOB · Resmi Gazete</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="https://www.turmob.org.tr"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
            >
              turmob.org.tr <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <a
              href="https://www.resmigazete.gov.tr"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 hover:underline transition-colors"
            >
              resmigazete.gov.tr <ExternalLink className="h-2.5 w-2.5" />
            </a>
            {duyurularAcik ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </button>

        {duyurularAcik && (
          <>
            {/* Sekme satırı */}
            <div className="flex border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAktifDuyuruSekme("turmob")}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  aktifDuyuruSekme === "turmob"
                    ? "border-blue-500 text-blue-600 bg-blue-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                TÜRMOB
                {turmobYukleniyor && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                {!turmobYukleniyor && turmobHaberler.length > 0 && (
                  <Badge variant="info" size="sm">{turmobHaberler.length}</Badge>
                )}
                {turmobYeniLinkler.length > 0 && (
                  <Badge variant="success" size="sm">{turmobYeniLinkler.length} yeni</Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAktifDuyuruSekme("gazete")}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  aktifDuyuruSekme === "gazete"
                    ? "border-blue-500 text-blue-600 bg-blue-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Resmi Gazete
                {gazeteYukleniyor && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                {!gazeteYukleniyor && visibleGazete.length > 0 && (
                  <Badge variant="info" size="sm">{visibleGazete.length}</Badge>
                )}
                {gazeteYeniIdler.length > 0 && (
                  <Badge variant="success" size="sm">{gazeteYeniIdler.length} yeni</Badge>
                )}
                {visibleGazete.some((i) => i.aksiyonGerekiyor) && (
                  <Badge variant="danger" size="sm">
                    {visibleGazete.filter((i) => i.aksiyonGerekiyor).length} acil
                  </Badge>
                )}
              </button>
            </div>

            {/* TÜRMOB sekmesi */}
            {aktifDuyuruSekme === "turmob" && (
              <div>
                {turmobYukleniyor ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-blue-700">
                    <Sparkles className="h-3 w-3 animate-pulse flex-shrink-0" />
                    TÜRMOB haberleri yükleniyor...
                  </div>
                ) : turmobHata || turmobHaberler.length === 0 ? (
                  <div className="flex items-center justify-between px-3 py-3">
                    <p className="text-xs text-slate-400">
                      {turmobHata ? "TÜRMOB haberleri şu an alınamadı." : "Haber bulunamadı."}
                    </p>
                    <a
                      href="https://www.turmob.org.tr"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                    >
                      turmob.org.tr <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {turmobHaberler.map((haber, i) => (
                      <li key={i} className="group px-3 py-2 hover:bg-slate-50">
                        <a
                          href={haber.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block min-w-0"
                          title={haber.ozet || haber.baslik}
                        >
                          <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600 leading-snug line-clamp-1 transition-colors">
                            {turmobYeniLinkler.includes(haber.link) && (
                              <Badge variant="success" size="sm" className="mr-1 align-middle">Yeni</Badge>
                            )}
                            {haber.baslik}
                          </span>
                          {haber.ozet && (
                            <span className="mt-0.5 block text-[10px] text-slate-500 leading-snug line-clamp-1">
                              {haber.ozet}
                            </span>
                          )}
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {new Date(haber.tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                          </span>
                        </a>
                      </li>
                    ))}
                    <li className="px-3 py-2">
                      <a
                        href="https://www.turmob.org.tr"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium"
                      >
                        Tüm haberler için turmob.org.tr <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  </ul>
                )}
              </div>
            )}

            {/* Resmi Gazete sekmesi */}
            {aktifDuyuruSekme === "gazete" && (
              <div>
                {gazeteYukleniyor && visibleGazete.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-blue-700">
                    <Sparkles className="h-3 w-3 animate-pulse flex-shrink-0" />
                    Resmi Gazete özeti yükleniyor...
                  </div>
                ) : !gazeteYukleniyor && gazeteHata && visibleGazete.length === 0 ? (
                  <div className="flex items-center justify-between px-3 py-3">
                    <p className="text-xs text-slate-400">Resmi Gazete özeti şu an alınamadı.</p>
                    <a
                      href="https://www.resmigazete.gov.tr"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                    >
                      resmigazete.gov.tr <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : visibleGazete.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {visibleGazete.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 group">
                        {item.aksiyonGerekiyor && (
                          <Badge variant="danger" size="sm" className="mt-0.5 flex-shrink-0">Acil</Badge>
                        )}
                        <a
                          href={item.kaynakLink || "https://www.resmigazete.gov.tr"}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="min-w-0 flex-1 block"
                          title={item.aiOzet || item.baslik}
                        >
                          <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600 leading-snug line-clamp-1 transition-colors">
                            {gazeteYeniIdler.includes(item.kaynakLink || item.baslik) && (
                              <Badge variant="success" size="sm" className="mr-1 align-middle">Yeni</Badge>
                            )}
                            {item.baslik}
                          </span>
                          {item.aiOzet && (
                            <span className="mt-0.5 block text-[10px] text-slate-500 leading-snug line-clamp-1">
                              {item.aiOzet}
                            </span>
                          )}
                        </a>
                        <button
                          type="button"
                          onClick={() => setDismissedGazete((prev) => [...prev, item.id])}
                          className="flex-shrink-0 rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Gizle"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                    <li className="px-3 py-2">
                      <a
                        href="https://www.resmigazete.gov.tr"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium"
                      >
                        Resmi Gazete sitesine git <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  </ul>
                ) : (
                  <div className="flex items-center justify-between px-3 py-3">
                    <p className="text-xs text-slate-400">Bugün ilgili madde yok.</p>
                    <a
                      href="https://www.resmigazete.gov.tr"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                    >
                      resmigazete.gov.tr <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Grafik satırı */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {/* Beyanname özeti bar chart */}
        <div className="md:col-span-2 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Beyanname Özeti</h3>
              <p className="text-xs text-slate-500 mt-0.5">Son 4 ay</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Verildi</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />Bekliyor</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Gecikti</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={beyanOzet} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="donem" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={20} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="verildi" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="bekliyor" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gecikti" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk dağılımı pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Risk Dağılımı</h3>
          <p className="text-xs text-slate-500 mb-3">Aktif mükellefler</p>
          <div className="sm:hidden space-y-2">
            {riskDagilim.map((d) => (
              <div key={d.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="text-sm font-bold text-slate-900">{d.value}</span>
              </div>
            ))}
          </div>
          <div className="hidden sm:block">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={riskDagilim}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                >
                  {riskDagilim.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="hidden sm:grid grid-cols-2 gap-1.5 mt-1">
            {riskDagilim.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-slate-600">{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Kritik mükellefler */}
        <div className="md:col-span-2 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Kritik & Yüksek Riskli Mükellefler</h3>
              <p className="text-xs text-slate-500 mt-0.5">Öncelikli aksiyon gerektiren firmalar</p>
            </div>
            <Link href="/musteriler" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              Tümü <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <MobileList empty={kritikRiskler.length === 0}>
            {kritikRiskler.map((risk) => {
              const m = risk.musteri;
              const tone = riskTonu(risk.skor);
              const acil = risk.skor >= 90 || (risk.enYakinVadeGun !== undefined && risk.enYakinVadeGun <= 1);
              const pulse = acil ? "animate-pulse" : tone.pulse;
              return (
                <MobileCard key={m.id} className={`${tone.bg} ${tone.border} ${pulse}`}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/musteriler/${m.id}`} className="min-w-0">
                      <p className={`text-sm font-semibold ${tone.text}`}>
                        {acil && "🚨 "}
                        {m.firmaAdi}
                      </p>
                      <p className="mt-1 text-xs font-mono text-slate-500">{displayVknTckn(m.vknTckn, user)}</p>
                    </Link>
                    <TahsilatBadge durum={m.tahsilatDurumu} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <MobileField label="Risk">
                      <RiskMetre skor={risk.skor} seviye={risk.seviye} showLabel size="sm" />
                    </MobileField>
                    <MobileField label="Yaklaşan Beyan">
                      {m.yaklasanBeyanname ? formatTarih(m.yaklasanBeyanname) : "—"}
                    </MobileField>
                  </div>
                </MobileCard>
              );
            })}
          </MobileList>
          <Table className="hidden md:block">
            <TableHead>
              <tr>
                <TableHeadCell>Firma</TableHeadCell>
                <TableHeadCell>Risk</TableHeadCell>
                <TableHeadCell>Tahsilat</TableHeadCell>
                <TableHeadCell>Yaklaşan Beyan</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {kritikRiskler.map((risk) => {
                const m = risk.musteri;
                const tone = riskTonu(risk.skor);
                const acil = risk.skor >= 90 || (risk.enYakinVadeGun !== undefined && risk.enYakinVadeGun <= 1);
                const pulse = acil ? "animate-pulse" : tone.pulse;
                return (
                <TableRow key={m.id} className={`${tone.bg} ${pulse}`}>
                  <TableCell>
                    <Link href={`/musteriler/${m.id}`} className="group">
                      <p className={`font-medium text-xs group-hover:text-blue-600 transition-colors ${tone.text}`}>
                        {acil && "🚨 "}
                        {m.firmaAdi}
                      </p>
                      <p className="text-slate-500 text-xs font-mono mt-0.5">{displayVknTckn(m.vknTckn, user)}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RiskMetre skor={risk.skor} seviye={risk.seviye} showLabel />
                  </TableCell>
                  <TableCell>
                    <TahsilatBadge durum={m.tahsilatDurumu} />
                  </TableCell>
                  <TableCell>
                    {m.yaklasanBeyanname ? (
                      <span className="text-xs text-slate-600 font-medium">
                        {formatTarih(m.yaklasanBeyanname)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-4">
          {/* Bekleyen görevler */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Bekleyen Görevler</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGorevModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Yeni
                </button>
                <Link href="/gorevler" className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium">
                  Tümü <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {bekleyenGorevler.slice(0, 4).map((g) => (
                <div key={g.id} className="px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{g.baslik}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{g.musteriAdi}</p>
                    </div>
                    <Badge
                      variant={
                        g.oncelik === "kritik" ? "danger" :
                        g.oncelik === "yuksek" ? "warning" : "neutral"
                      }
                    >
                      {ONCELIK_LABEL[g.oncelik] ?? g.oncelik}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{formatTarih(g.terminTarihi)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yeni tebligatlar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Yeni Tebligatlar</h3>
              <Link href="/tebligatlar" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Tümü <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {yeniTebligatlar.map((t) => (
                <div key={t.id} className="px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 leading-snug">{t.baslik}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.musteriAdi}</p>
                      <p className="text-xs text-slate-400">{formatTarih(t.tarih)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">GİB Sync Durumu</h3>
              <Link href="/ayarlar" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Ayarlar <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {gibSyncLogs.length === 0 ? (
                <div className="px-5 py-4 text-xs text-slate-400">Henüz sync kaydı yok</div>
              ) : (
                gibSyncLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-700">{SYNC_TIPI_LABEL[log.syncTipi] ?? log.syncTipi}</p>
                      <Badge variant={log.durum === "basarili" ? "success" : log.durum === "basarisiz" ? "danger" : "warning"}>
                        {SYNC_DURUM_LABEL[log.durum] ?? log.durum}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{formatTarih(log.baslamaTarihi)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Yaklaşan beyanlar */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Yaklaşan Beyannameler</h3>
            <p className="text-xs text-slate-500 mt-0.5">Son tarihe göre sıralı</p>
          </div>
          <Link href="/beyannameler" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            Tümü <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <MobileList empty={yaklasanBeyanlar.length === 0}>
          {yaklasanBeyanlar.map((b) => (
            <MobileCard key={b.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{b.musteriAdi}</p>
                  <p className="mt-1 text-xs text-slate-500">{b.donem}</p>
                </div>
                <BeyannameBadge durum={b.durum} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MobileField label="Beyan Türü">
                  <Badge variant="info">{BEYAN_TUR_LABEL[b.tur] ?? b.tur}</Badge>
                </MobileField>
                <MobileField label="Son Tarih">
                  <span className="font-semibold text-slate-800">{formatTarih(b.sonTarih)}</span>
                </MobileField>
                <MobileField label="Sorumlu" className="col-span-2">
                  {b.sorumlu}
                </MobileField>
              </div>
            </MobileCard>
          ))}
        </MobileList>
        <Table className="hidden md:block">
          <TableHead>
            <tr>
              <TableHeadCell>Mükellef</TableHeadCell>
              <TableHeadCell>Beyan Türü</TableHeadCell>
              <TableHeadCell>Dönem</TableHeadCell>
              <TableHeadCell>Son Tarih</TableHeadCell>
              <TableHeadCell>Sorumlu</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {yaklasanBeyanlar.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <span className="font-medium text-slate-800 text-xs">{b.musteriAdi}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{BEYAN_TUR_LABEL[b.tur] ?? b.tur}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600">{b.donem}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-slate-800">{formatTarih(b.sonTarih)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600">{b.sorumlu}</span>
                </TableCell>
                <TableCell>
                  <BeyannameBadge durum={b.durum} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modaller */}
      <YeniGorevModal
        open={showGorevModal}
        onClose={() => setShowGorevModal(false)}
      />
      <WhatsAppGonderimModal
        open={showWaModal}
        onClose={() => setShowWaModal(false)}
      />
    </div>
  );
}
