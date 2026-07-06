"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Calendar, CheckCircle2, Circle, ChevronDown, MoreHorizontal,
  Plus, Search, Tag, Trash2, Wand2, X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, GorevDurumBadge } from "@/components/ui/Badge";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { GorevDetayDrawer } from "@/components/modals/GorevDetayDrawer";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { getOfisId } from "@/lib/domain/office";
import { gorevInputFromOneri, hesaplaOtomatikGorevOnerileri } from "@/lib/domain/otomatikGorev";
import {
  createGorev as createGorevFirebase,
  deleteGorev as deleteGorevFirebase,
  updateGorev as updateGorevFirebase,
  updateGorevDurum as updateGorevDurumFirebase,
} from "@/lib/firebase/repositories";
import { isGorevGecikti, normalizeGorevNotlar } from "@/lib/utils/gorev";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { formatTarih } from "@/lib/utils/format";
import { useToast } from "@/lib/context/ToastContext";
import type { Gorev, GorevDurum, GorevNot, GorevTip } from "@/lib/types";

// ── Sabitler ──────────────────────────────────────────────────────────────────

type FilterTab = "tumu" | "beklemede" | "devam" | "tamamlandi" | "iptal";

const DURUM_KOLONLAR: { key: GorevDurum; label: string; color: string; bg: string }[] = [
  { key: "beklemede",  label: "Yapılacak",    color: "border-slate-300",   bg: "bg-slate-100"  },
  { key: "devam",      label: "Devam Ediyor", color: "border-blue-400",    bg: "bg-blue-50"    },
  { key: "tamamlandi", label: "Tamamlandı",   color: "border-emerald-400", bg: "bg-emerald-50" },
  { key: "iptal",      label: "İptal",        color: "border-red-300",     bg: "bg-red-50"     },
];

const TIP_LABEL: Record<GorevTip, string> = {
  beyanname: "Beyanname",
  tebligat:  "Tebligat",
  tahsilat:  "Tahsilat",
  belge:     "Belge",
  kdv2:      "KDV2",
  diger:     "Diğer",
};

const TIP_SIRA: GorevTip[] = ["beyanname", "tebligat", "tahsilat", "belge", "kdv2", "diger"];

const ONCELIK_LABEL: Record<string, string> = {
  dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", kritik: "Kritik",
};

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function GorevlerPage() {
  const toast    = useToast();
  const { user } = useAuth();
  const logAudit = useAuditLog();
  const quickRef = useRef<HTMLInputElement>(null);

  const [view,           setView]           = useState<"tablo" | "kanban">("tablo");
  const [activeTab,      setActiveTab]      = useState<FilterTab>("tumu");
  const [aramaText,      setAramaText]      = useState("");
  const [filterOncelik,  setFilterOncelik]  = useState("tumu");
  const [filterTip,      setFilterTip]      = useState<"tumu" | GorevTip>("tumu");
  const [showYeniModal,  setShowYeniModal]  = useState(false);
  const [yeniModalDurum, setYeniModalDurum] = useState<GorevDurum | undefined>(undefined);
  const [otomatikLoading,setOtomatikLoading]= useState(false);
  const [seciliGorev,    setSeciliGorev]    = useState<Gorev | null>(null);
  const [quickTitle,     setQuickTitle]     = useState("");
  const [quickLoading,   setQuickLoading]   = useState(false);

  const {
    musteriler, gorevler: loadedGorevler, tebligatlar,
    beyannameler, tahsilatlar, belgeler, loading, source,
  } = useAppData();

  const [gorevler, setGorevler] = useState<Gorev[]>(loadedGorevler);
  useEffect(() => { setGorevler(loadedGorevler); }, [loadedGorevler]);

  // ── Tab sayıları ─────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => ({
    tumu:        gorevler.filter(g => g.durum !== "tamamlandi" && g.durum !== "iptal").length,
    beklemede:   gorevler.filter(g => g.durum === "beklemede").length,
    devam:       gorevler.filter(g => g.durum === "devam").length,
    tamamlandi:  gorevler.filter(g => g.durum === "tamamlandi").length,
    iptal:       gorevler.filter(g => g.durum === "iptal").length,
  }), [gorevler]);

  // ── Filtreleme ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const search = aramaText.toLowerCase();
    return gorevler
      .filter(g => {
        const matchSearch   = !search || g.baslik.toLowerCase().includes(search) || g.musteriAdi.toLowerCase().includes(search);
        const matchTab      = activeTab === "tumu"
          ? g.durum !== "tamamlandi" && g.durum !== "iptal"
          : g.durum === activeTab;
        const matchOncelik  = filterOncelik === "tumu" || g.oncelik === filterOncelik;
        const matchTip      = filterTip === "tumu" || g.tip === filterTip;
        return matchSearch && matchTab && matchOncelik && matchTip;
      })
      .sort((a, b) => a.terminTarihi.localeCompare(b.terminTarihi));
  }, [gorevler, aramaText, activeTab, filterOncelik, filterTip]);

  // ── Tablo görünümü için tip bazlı gruplar ─────────────────────────────────
  const grupluGorevler = useMemo(() => {
    const map = new Map<GorevTip, Gorev[]>();
    TIP_SIRA.forEach(tip => {
      const list = filtered.filter(g => g.tip === tip);
      if (list.length > 0) map.set(tip, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // ── Otomatik öneriler ─────────────────────────────────────────────────────
  const otomatikOneriler = hesaplaOtomatikGorevOnerileri({
    musteriler, gorevler, tebligatlar, beyannameler, tahsilatlar, belgeler,
  });

  // ── Yardımcılar ───────────────────────────────────────────────────────────
  const applyGorevPatch = (id: string, patch: Partial<Gorev>) => {
    setGorevler(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    setSeciliGorev(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  };

  const handleDurumGuncelle = async (id: string, durum: GorevDurum) => {
    applyGorevPatch(id, { durum, tamamlanmaTarihi: durum === "tamamlandi" ? new Date().toISOString() : undefined });
    if (source !== "firebase") return;
    try {
      await updateGorevDurumFirebase(id, durum);
      const gorev = gorevler.find(g => g.id === id);
      await logAudit({ action: "status_change", entityType: "gorev", entityId: id, entityLabel: gorev?.baslik, summary: `Görev durumu ${durum} olarak güncellendi`, after: { durum } });
    } catch (error) {
      toast.error("Görev durumu kaydedilemedi", parseFirestoreError(error));
    }
  };

  const handleGorevGuncelle = async (id: string, patch: Partial<Gorev>) => {
    applyGorevPatch(id, patch);
    if (source !== "firebase") return;
    try {
      await updateGorevFirebase(id, patch);
      const gorev = gorevler.find(g => g.id === id);
      await logAudit({ action: "update", entityType: "gorev", entityId: id, entityLabel: gorev?.baslik, summary: "Görev bilgileri güncellendi", after: patch as Record<string, unknown> });
    } catch (error) {
      toast.error("Görev güncellemesi kaydedilemedi", parseFirestoreError(error));
    }
  };

  const handleNotEkle = async (id: string, yeniNot: GorevNot) => {
    const hedef = gorevler.find(g => g.id === id);
    const guncelNotlar = [...normalizeGorevNotlar(hedef?.notlar), yeniNot];
    applyGorevPatch(id, { notlar: guncelNotlar });
    if (source !== "firebase") return;
    try {
      await updateGorevFirebase(id, { notlar: guncelNotlar });
      await logAudit({ action: "update", entityType: "gorev", entityId: id, entityLabel: hedef?.baslik, summary: "Göreve not eklendi", after: { notSayisi: guncelNotlar.length } });
    } catch (error) {
      toast.error("Görev notu kaydedilemedi", parseFirestoreError(error));
    }
  };

  const handleNotSil = async (id: string, notId: string) => {
    const hedef = gorevler.find(g => g.id === id);
    const guncelNotlar = normalizeGorevNotlar(hedef?.notlar).filter(n => n.id !== notId);
    applyGorevPatch(id, { notlar: guncelNotlar });
    if (source !== "firebase") return;
    try {
      await updateGorevFirebase(id, { notlar: guncelNotlar });
    } catch (error) {
      toast.error("Not silinemedi", parseFirestoreError(error));
    }
  };

  const handleGorevSil = async (id: string) => {
    const silinenGorev = gorevler.find(g => g.id === id);
    setGorevler(prev => prev.filter(g => g.id !== id));
    setSeciliGorev(null);
    if (source !== "firebase") return;
    try {
      await deleteGorevFirebase(id);
      await logAudit({ action: "delete", entityType: "gorev", entityId: id, entityLabel: silinenGorev?.baslik, summary: "Görev silindi", before: silinenGorev as unknown as Record<string, unknown> });
    } catch (error) {
      toast.error("Görev silinemedi", parseFirestoreError(error));
    }
  };

  const handleOtomatikGorevOlustur = async () => {
    if (otomatikOneriler.length === 0) {
      toast.info("Öneri yok", "Acil göreve dönüştürülecek sinyal yok");
      return;
    }
    setOtomatikLoading(true);
    try {
      const created = await Promise.all(
        otomatikOneriler.map(async (oneri, i) => {
          const input = gorevInputFromOneri(oneri, getOfisId(user?.ofisId));
          if (source === "firebase") return createGorevFirebase(input);
          return { ...input, id: `auto-${Date.now()}-${i}`, durum: "beklemede" as const, createdAt: new Date().toISOString() };
        })
      );
      setGorevler(prev => {
        const existing = new Set(prev.map(g => g.id));
        return [...created.filter(g => !existing.has(g.id)), ...prev];
      });
      await Promise.all(created.map(g => logAudit({ action: "create", entityType: "gorev", entityId: g.id, entityLabel: g.baslik, summary: "Otomatik görev oluşturuldu", after: { tip: g.tip, oncelik: g.oncelik } })));
      toast.success(`${created.length} otomatik görev oluşturuldu`);
    } catch (error) {
      toast.error("Otomatik görevler oluşturulamadı", parseFirestoreError(error));
    } finally {
      setOtomatikLoading(false);
    }
  };

  // Hızlı görev ekle (sadece başlık — direkt kayıt)
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    setQuickLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const atanan = user ? `${user.ad} ${user.soyad}`.trim() : "Sistem";
      let created: Gorev;
      if (isFirebaseConfigured) {
        created = await createGorevFirebase({
          ofisId: getOfisId(user?.ofisId),
          baslik: title,
          aciklama: "",
          musteriId: "",
          musteriAdi: "Genel",
          atananKisi: atanan,
          atayanKisi: atanan,
          terminTarihi: today,
          oncelik: "normal",
          tip: "diger",
        });
      } else {
        await new Promise((r) => setTimeout(r, 300));
        created = {
          id: `g-${Date.now()}`,
          ofisId: getOfisId(user?.ofisId),
          baslik: title,
          aciklama: "",
          musteriId: "",
          musteriAdi: "Genel",
          atananKisi: atanan,
          atayanKisi: atanan,
          terminTarihi: today,
          oncelik: "normal",
          durum: "beklemede",
          tip: "diger",
          createdAt: new Date().toISOString(),
        };
      }
      await logAudit({
        action: "create",
        entityType: "gorev",
        entityId: created.id,
        entityLabel: created.baslik,
        summary: "Hızlı görev oluşturuldu",
        after: { tip: created.tip, oncelik: created.oncelik },
      });
      toast.success("Görev eklendi", `"${title}" görevi oluşturuldu`);
      setQuickTitle("");
      quickRef.current?.focus();
    } catch (error) {
      console.error(error);
      toast.error("Görev kaydedilemedi", parseFirestoreError(error));
    } finally {
      setQuickLoading(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <>
      <div>
        <PageHeader
          title="Görev Yönetimi"
          subtitle={`${tabCounts.tumu} bekleyen görev`}
          breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Görevler" }]}
          action={
            <div className="flex items-center gap-2">
              {/* Kanban / Tablo toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setView("tablo")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "tablo" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  Tablo
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  Kanban
                </button>
              </div>
              <Button
                variant="outline"
                icon={<Wand2 className="w-4 h-4" />}
                loading={otomatikLoading}
                disabled={otomatikOneriler.length === 0}
                onClick={handleOtomatikGorevOlustur}
              >
                Otomatik ({otomatikOneriler.length})
              </Button>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setYeniModalDurum(undefined); setShowYeniModal(true); }}>
                Yeni Görev
              </Button>
            </div>
          }
        />

        {/* Otomatik öneri banner */}
        {otomatikOneriler.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Otomatik görev önerileri</p>
                <p className="text-xs text-amber-700 mt-0.5">{otomatikOneriler.length} sinyal göreve dönüştürülmeye hazır.</p>
              </div>
              <Button size="sm" variant="outline" icon={<Wand2 className="w-3.5 h-3.5" />} loading={otomatikLoading} onClick={handleOtomatikGorevOlustur}>
                Tümünü Oluştur
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
              {otomatikOneriler.slice(0, 3).map(oneri => (
                <div key={oneri.id} className="bg-white border border-amber-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant={oneri.oncelik === "kritik" ? "danger" : "warning"}>{oneri.oncelik}</Badge>
                    <span className="text-xs text-slate-400">{oneri.kaynak}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{oneri.baslik}</p>
                  <p className="text-xs text-slate-500 mt-1">{oneri.gerekce}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filtre satırı ─────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          {/* Pill tabs */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 self-start w-full sm:w-fit overflow-x-auto">
            {(
              [
                { key: "tumu",       label: "Tümü"         },
                { key: "beklemede",  label: "Beklemede"    },
                { key: "devam",      label: "Devam Ediyor" },
                { key: "tamamlandi", label: "Tamamlandı"   },
                { key: "iptal",      label: "İptal"        },
              ] as { key: FilterTab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
                {tabCounts[key] > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {tabCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sağ taraf: arama + öncelik filtresi */}
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            <div className="flex flex-1 items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Görev veya müşteri ara..."
                value={aramaText}
                onChange={e => setAramaText(e.target.value)}
                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
              />
              {aramaText && (
                <button onClick={() => setAramaText("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={filterOncelik}
              onChange={e => setFilterOncelik(e.target.value)}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
            >
              <option value="tumu">Tüm Öncelikler</option>
              <option value="kritik">🔴 Kritik</option>
              <option value="yuksek">🟠 Yüksek</option>
              <option value="normal">🟡 Normal</option>
              <option value="dusuk">🟢 Düşük</option>
            </select>
            <select
              value={filterTip}
              onChange={e => setFilterTip(e.target.value as "tumu" | GorevTip)}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
            >
              <option value="tumu">Tüm Türler</option>
              {TIP_SIRA.map(tip => (
                <option key={tip} value={tip}>{TIP_LABEL[tip]}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">{filtered.length} görev</span>
          </div>
        </div>

        {/* ── Kanban görünümü ───────────────────────────────────────────── */}
        {view === "kanban" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {DURUM_KOLONLAR.map(kolon => {
              const kolonGorevler = filtered.filter(g => g.durum === kolon.key);
              return (
                <div
                  key={kolon.key}
                  className={`flex flex-col rounded-2xl p-3 min-h-48 ${kolon.bg}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) handleDurumGuncelle(id, kolon.key);
                  }}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-sm font-bold text-slate-800">{kolon.label}</span>
                    <span className="min-w-[22px] text-center rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 shadow-sm">
                      {kolonGorevler.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    {kolonGorevler.map(gorev => {
                      const gecikti = isGorevGecikti(gorev);
                      return (
                      <div
                        key={gorev.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData("text/plain", gorev.id)}
                        onClick={() => setSeciliGorev(gorev)}
                        className={`bg-white rounded-xl border p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
                          gecikti ? "border-red-300 border-l-4 border-l-red-500" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 leading-snug flex-1">{gorev.baslik}</p>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setSeciliGorev(gorev); }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-600"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-blue-600 font-medium mt-1.5">{gorev.musteriAdi}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ${gorev.oncelik === "kritik" ? "text-red-500" : gorev.oncelik === "yuksek" ? "text-amber-500" : "text-slate-400"}`} />
                          <span className="text-xs text-slate-500">{ONCELIK_LABEL[gorev.oncelik] ?? gorev.oncelik}</span>
                          {gecikti && (
                            <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                              Gecikti
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                          <div className={`flex items-center gap-1 text-xs ${gecikti ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                            <Calendar className="w-3 h-3" />
                            {formatTarih(gorev.terminTarihi)}
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: "#2563eb" }}
                            title={gorev.atananKisi}
                          >
                            {gorev.atananKisi.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setYeniModalDurum(kolon.key); setShowYeniModal(true); }}
                    className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-2.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-white hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" /> Kart ekle
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tablo görünümü ────────────────────────────────────────────── */}
        {view === "tablo" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

            {/* Hızlı ekle çubuğu */}
            <div className="border-b border-slate-100 px-5 py-3 bg-slate-50/60">
              <form onSubmit={handleQuickAdd} className="flex items-center gap-3">
                <Plus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <input
                  ref={quickRef}
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  placeholder="Görev ekle... (Enter ile hızlıca kaydet)"
                  className="flex-1 text-[13.5px] text-slate-600 placeholder:text-slate-400 focus:outline-none bg-transparent font-medium"
                />
                {quickTitle && (
                  <>
                    <button type="submit" disabled={quickLoading} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {quickLoading ? "Ekleniyor..." : "Ekle"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setYeniModalDurum(undefined); setShowYeniModal(true); }}
                      className="text-xs font-medium text-slate-500 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Detaylı
                    </button>
                  </>
                )}
              </form>
            </div>

            {/* Gruplu tablo */}
            {filtered.length === 0 ? (
              <Table>
                <TableBody>
                  <TableEmpty colSpan={7} message="Kriterlere uyan görev bulunamadı" />
                </TableBody>
              </Table>
            ) : (
              <div className="divide-y divide-slate-100">
                {grupluGorevler.map(([tip, tipGorevleri]) => (
                  <div key={tip}>
                    {/* Grup başlığı */}
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50/80 border-b border-slate-100">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                        {TIP_LABEL[tip]}
                      </span>
                      <span className="text-[10.5px] font-semibold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        {tipGorevleri.length}
                      </span>
                    </div>

                    {/* Satırlar */}
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeadCell>Görev</TableHeadCell>
                          <TableHeadCell>Müşteri</TableHeadCell>
                          <TableHeadCell>Öncelik</TableHeadCell>
                          <TableHeadCell>Atanan</TableHeadCell>
                          <TableHeadCell>Termin</TableHeadCell>
                          <TableHeadCell>Durum</TableHeadCell>
                          <TableHeadCell></TableHeadCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {tipGorevleri.map(gorev => {
                          const isOverdue = isGorevGecikti(gorev);
                          return (
                            <TableRow
                              key={gorev.id}
                              onClick={() => setSeciliGorev(gorev)}
                              className="cursor-pointer group"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {/* Tamamla toggle */}
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDurumGuncelle(gorev.id, gorev.durum === "tamamlandi" ? "beklemede" : "tamamlandi");
                                    }}
                                    className="flex-shrink-0 text-slate-300 hover:text-emerald-500 transition-colors"
                                  >
                                    {gorev.durum === "tamamlandi"
                                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      : <Circle className="w-4 h-4" />
                                    }
                                  </button>
                                  <div className={gorev.durum === "tamamlandi" ? "opacity-50" : ""}>
                                    <p className={`text-sm font-medium text-slate-800 ${gorev.durum === "tamamlandi" ? "line-through text-slate-400" : ""}`}>
                                      {gorev.baslik}
                                    </p>
                                    {gorev.aciklama && (
                                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{gorev.aciklama}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs font-medium text-blue-600">{gorev.musteriAdi}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={gorev.oncelik === "kritik" ? "danger" : gorev.oncelik === "yuksek" ? "warning" : "neutral"}>
                                  {ONCELIK_LABEL[gorev.oncelik] ?? gorev.oncelik}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 text-xs font-bold">
                                      {gorev.atananKisi.split(" ").map(n => n[0]).join("")}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-600">{gorev.atananKisi}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium ${isOverdue ? "text-red-500" : "text-slate-700"}`}>
                                  {formatTarih(gorev.terminTarihi)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <GorevDurumBadge durum={gorev.durum} />
                              </TableCell>
                              <TableCell>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); handleGorevSil(gorev.id); }}
                                  className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}

            {/* Footer stats */}
            {gorevler.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-4">
                <span className="text-[12px] text-slate-400">{tabCounts.tumu} bekleyen</span>
                {tabCounts.tamamlandi > 0 && (
                  <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {tabCounts.tamamlandi} tamamlandı
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <YeniGorevModal
        open={showYeniModal}
        onClose={() => setShowYeniModal(false)}
        initialDurum={yeniModalDurum}
        onCreated={gorev => { if (source !== "firebase") setGorevler(prev => [gorev, ...prev]); }}
        onSuccess={() => toast.success("Görev listesi güncellendi")}
      />
      <GorevDetayDrawer
        gorev={seciliGorev}
        onClose={() => setSeciliGorev(null)}
        onDurumGuncelle={handleDurumGuncelle}
        onNotEkle={handleNotEkle}
        onNotSil={handleNotSil}
        onGorevGuncelle={handleGorevGuncelle}
        onGorevSil={handleGorevSil}
      />
    </>
  );
}
