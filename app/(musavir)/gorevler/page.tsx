"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronDown, MoreHorizontal, Plus, Search, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, GorevDurumBadge } from "@/components/ui/Badge";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { GorevDetayDrawer } from "@/components/modals/GorevDetayDrawer";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { getOfisId } from "@/lib/domain/office";
import {
  gorevInputFromOneri,
  hesaplaOtomatikGorevOnerileri,
} from "@/lib/domain/otomatikGorev";
import {
  createGorev as createGorevFirebase,
  deleteGorev as deleteGorevFirebase,
  updateGorev as updateGorevFirebase,
  updateGorevDurum as updateGorevDurumFirebase,
} from "@/lib/firebase/repositories";
import { normalizeGorevNotlar } from "@/lib/utils/gorev";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { formatTarih } from "@/lib/utils/format";
import { useToast } from "@/lib/context/ToastContext";
import type { Gorev, GorevDurum, GorevNot, GorevOncelik } from "@/lib/types";

const DURUM_KOLONLAR: { key: GorevDurum; label: string; color: string; bg: string }[] = [
  { key: "beklemede", label: "Yapılacak",     color: "border-slate-300",   bg: "bg-slate-100" },
  { key: "devam",     label: "Devam Ediyor",  color: "border-blue-400",    bg: "bg-blue-50"   },
  { key: "tamamlandi",label: "Tamamlandı",    color: "border-emerald-400", bg: "bg-emerald-50"},
  { key: "iptal",     label: "İptal",         color: "border-red-300",     bg: "bg-red-50"    },
];


export default function GorevlerPage() {
  const toast = useToast();
  const { user } = useAuth();
  const logAudit = useAuditLog();
  const [view, setView] = useState<"kanban" | "tablo">("tablo");
  const [aramaText, setAramaText] = useState("");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [filterOncelik, setFilterOncelik] = useState("tumu");
  const [showYeniModal, setShowYeniModal] = useState(false);
  const [otomatikLoading, setOtomatikLoading] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Gorev | null>(null);
  const {
    musteriler,
    gorevler: loadedGorevler,
    tebligatlar,
    beyannameler,
    tahsilatlar,
    belgeler,
    loading,
    source,
  } = useAppData();
  const [gorevler, setGorevler] = useState<Gorev[]>(loadedGorevler);

  useEffect(() => {
    setGorevler(loadedGorevler);
  }, [loadedGorevler]);

  const applyGorevPatch = (id: string, patch: Partial<Gorev>) => {
    setGorevler((prev) =>
      prev.map((gorev) => (gorev.id === id ? { ...gorev, ...patch } : gorev))
    );
    setSeciliGorev((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  const handleDurumGuncelle = async (id: string, durum: GorevDurum) => {
    applyGorevPatch(id, {
      durum,
      tamamlanmaTarihi: durum === "tamamlandi" ? new Date().toISOString() : undefined,
    });

    if (source !== "firebase") return;

    try {
      await updateGorevDurumFirebase(id, durum);
      const gorev = gorevler.find((item) => item.id === id);
      await logAudit({
        action: "status_change",
        entityType: "gorev",
        entityId: id,
        entityLabel: gorev?.baslik,
        summary: `Görev durumu ${durum} olarak güncellendi`,
        after: { durum },
      });
    } catch (error) {
      console.error(error);
      toast.error("Görev durumu kaydedilemedi", parseFirestoreError(error));
      throw error;
    }
  };

  const handleGorevGuncelle = async (id: string, patch: Partial<Gorev>) => {
    applyGorevPatch(id, patch);

    if (source !== "firebase") return;

    try {
      await updateGorevFirebase(id, patch);
      const gorev = gorevler.find((item) => item.id === id);
      await logAudit({
        action: "update",
        entityType: "gorev",
        entityId: id,
        entityLabel: gorev?.baslik,
        summary: "Görev bilgileri güncellendi",
        after: patch as Record<string, unknown>,
      });
    } catch (error) {
      console.error(error);
      toast.error("Görev güncellemesi kaydedilemedi", parseFirestoreError(error));
      throw error;
    }
  };

  const handleNotEkle = async (id: string, yeniNot: GorevNot) => {
    const hedefGorev = gorevler.find((gorev) => gorev.id === id);
    const guncelNotlar = [...normalizeGorevNotlar(hedefGorev?.notlar), yeniNot];

    applyGorevPatch(id, { notlar: guncelNotlar });

    if (source !== "firebase") return;

    try {
      await updateGorevFirebase(id, { notlar: guncelNotlar });
      await logAudit({
        action: "update",
        entityType: "gorev",
        entityId: id,
        entityLabel: hedefGorev?.baslik,
        summary: "Göreve not eklendi",
        after: { notSayisi: guncelNotlar.length },
      });
    } catch (error) {
      console.error(error);
      toast.error("Görev notu kaydedilemedi", parseFirestoreError(error));
      throw error;
    }
  };

  const handleGorevSil = async (id: string) => {
    const silinenGorev = gorevler.find((gorev) => gorev.id === id);
    setGorevler((prev) => prev.filter((gorev) => gorev.id !== id));
    setSeciliGorev(null);

    if (source !== "firebase") return;

    try {
      await deleteGorevFirebase(id);
      await logAudit({
        action: "delete",
        entityType: "gorev",
        entityId: id,
        entityLabel: silinenGorev?.baslik,
        summary: "Görev silindi",
        before: silinenGorev as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.error(error);
      toast.error("Görev silinemedi", parseFirestoreError(error));
      throw error;
    }
  };

  const otomatikOneriler = hesaplaOtomatikGorevOnerileri({
    musteriler,
    gorevler,
    tebligatlar,
    beyannameler,
    tahsilatlar,
    belgeler,
  });

  const handleOtomatikGorevOlustur = async () => {
    if (otomatikOneriler.length === 0) {
      toast.info("Öneri yok", "Acil göreve dönüştürülecek yeni sinyal bulunmuyor");
      return;
    }

    setOtomatikLoading(true);
    try {
      const created = await Promise.all(
        otomatikOneriler.map(async (oneri, index) => {
          const input = gorevInputFromOneri(oneri, getOfisId(user?.ofisId));

          if (source === "firebase") {
            return createGorevFirebase(input);
          }

          return {
            ...input,
            id: `auto-${Date.now()}-${index}`,
            durum: "beklemede" as const,
            createdAt: new Date().toISOString(),
          };
        })
      );

      setGorevler((prev) => {
        const existing = new Set(prev.map((gorev) => gorev.id));
        return [...created.filter((gorev) => !existing.has(gorev.id)), ...prev];
      });
      await Promise.all(
        created.map((gorev) =>
          logAudit({
            action: "create",
            entityType: "gorev",
            entityId: gorev.id,
            entityLabel: gorev.baslik,
            summary: "Otomatik görev oluşturuldu",
            after: {
              tip: gorev.tip,
              oncelik: gorev.oncelik,
              musteriId: gorev.musteriId,
            },
          })
        )
      );
      toast.success(`${created.length} otomatik görev oluşturuldu`);
    } catch (error) {
      console.error(error);
      toast.error("Otomatik görevler oluşturulamadı", parseFirestoreError(error));
    } finally {
      setOtomatikLoading(false);
    }
  };

  const filtered = gorevler.filter((gorev) => {
    const search = aramaText.toLowerCase();
    const matchesSearch =
      !search ||
      gorev.baslik.toLowerCase().includes(search) ||
      gorev.musteriAdi.toLowerCase().includes(search);
    const matchesDurum = filterDurum === "tumu" || gorev.durum === filterDurum;
    const matchesOncelik = filterOncelik === "tumu" || gorev.oncelik === filterOncelik;
    return matchesSearch && matchesDurum && matchesOncelik;
  });

  const bekleyenSayi = gorevler.filter(
    (gorev) => gorev.durum !== "tamamlandi" && gorev.durum !== "iptal"
  ).length;

  if (loading) return <PageLoading />;

  return (
    <>
      <div>
        <PageHeader
          title="Görev Yönetimi"
          subtitle={`${bekleyenSayi} bekleyen görev`}
          action={
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setView("tablo")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "tablo" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Tablo
                </button>
                <button
                  onClick={() => setView("kanban")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
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
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowYeniModal(true)}>
                Yeni Görev
              </Button>
            </div>
          }
        />

        {otomatikOneriler.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Otomatik görev önerileri</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {otomatikOneriler.length} sinyal göreve dönüştürülmeye hazır.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={<Wand2 className="w-3.5 h-3.5" />}
                loading={otomatikLoading}
                onClick={handleOtomatikGorevOlustur}
              >
                Tümünü Oluştur
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
              {otomatikOneriler.slice(0, 3).map((oneri) => (
                <div key={oneri.id} className="bg-white border border-amber-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant={oneri.oncelik === "kritik" ? "danger" : "warning"}>
                      {oneri.oncelik}
                    </Badge>
                    <span className="text-xs text-slate-400">{oneri.kaynak}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{oneri.baslik}</p>
                  <p className="text-xs text-slate-500 mt-1">{oneri.gerekce}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Görev veya müşteri ara..."
                value={aramaText}
                onChange={(e) => setAramaText(e.target.value)}
                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
              />
            </div>
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
            >
              <option value="tumu">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="devam">Devam Ediyor</option>
              <option value="tamamlandi">Tamamlandı</option>
              <option value="iptal">İptal</option>
            </select>
            <select
              value={filterOncelik}
              onChange={(e) => setFilterOncelik(e.target.value)}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
            >
              <option value="tumu">Tüm Öncelikler</option>
              <option value="kritik">Kritik</option>
              <option value="yuksek">Yüksek</option>
              <option value="normal">Normal</option>
              <option value="dusuk">Düşük</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} görev</span>
          </div>
        </div>

        {view === "kanban" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {DURUM_KOLONLAR.map((kolon) => {
              const kolonGorevler = filtered.filter((gorev) => gorev.durum === kolon.key);
              return (
                <div
                  key={kolon.key}
                  className={`flex flex-col rounded-2xl p-3 min-h-48 ${kolon.bg}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const gorevId = e.dataTransfer.getData("text/plain");
                    if (gorevId) handleDurumGuncelle(gorevId, kolon.key);
                  }}
                >
                  {/* Kolon başlığı */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-sm font-bold text-slate-800">{kolon.label}</span>
                    <span className="min-w-[22px] text-center rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 shadow-sm">
                      {kolonGorevler.length}
                    </span>
                  </div>

                  {/* Kartlar */}
                  <div className="flex flex-col gap-2 flex-1">
                    {kolonGorevler.map((gorev) => (
                      <div
                        key={gorev.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", gorev.id)}
                        onClick={() => setSeciliGorev(gorev)}
                        className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        {/* Başlık + 3 nokta */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900 leading-snug flex-1">
                            {gorev.baslik}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSeciliGorev(gorev); }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-600"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Müşteri */}
                        <p className="text-xs text-blue-600 font-medium mt-1.5">{gorev.musteriAdi}</p>

                        {/* Öncelik */}
                        <div className="flex items-center gap-1 mt-2">
                          <ChevronDown
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              gorev.oncelik === "kritik" ? "text-red-500" :
                              gorev.oncelik === "yuksek" ? "text-amber-500" :
                              "text-slate-400"
                            }`}
                          />
                          <span className="text-xs text-slate-500 capitalize">{gorev.oncelik}</span>
                        </div>

                        {/* Alt satır: tarih + avatar */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {formatTarih(gorev.terminTarihi)}
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: "#2563eb" }}
                            title={gorev.atananKisi}
                          >
                            {gorev.atananKisi.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Kart ekle */}
                  <button
                    type="button"
                    onClick={() => setShowYeniModal(true)}
                    className="mt-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-2.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-400 hover:bg-white hover:text-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Kart ekle
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {view === "tablo" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <Table>
              <TableHead>
                <tr>
                  <TableHeadCell>Görev</TableHeadCell>
                  <TableHeadCell>Müşteri</TableHeadCell>
                  <TableHeadCell>Tür</TableHeadCell>
                  <TableHeadCell>Öncelik</TableHeadCell>
                  <TableHeadCell>Atanan</TableHeadCell>
                  <TableHeadCell>Termin</TableHeadCell>
                  <TableHeadCell>Durum</TableHeadCell>
                </tr>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableEmpty colSpan={7} />
                ) : (
                  filtered.map((gorev) => (
                    <TableRow key={gorev.id} onClick={() => setSeciliGorev(gorev)} className="cursor-pointer">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{gorev.baslik}</p>
                          {gorev.aciklama && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{gorev.aciklama}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-blue-600">{gorev.musteriAdi}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{gorev.tip}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            gorev.oncelik === "kritik" ? "danger" :
                            gorev.oncelik === "yuksek" ? "warning" : "neutral"
                          }
                        >
                          {gorev.oncelik}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-xs font-bold">
                              {gorev.atananKisi.split(" ").map((name) => name[0]).join("")}
                            </span>
                          </div>
                          <span className="text-xs text-slate-600">{gorev.atananKisi}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-700">{formatTarih(gorev.terminTarihi)}</span>
                      </TableCell>
                      <TableCell>
                        <GorevDurumBadge durum={gorev.durum} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <YeniGorevModal
        open={showYeniModal}
        onClose={() => setShowYeniModal(false)}
        onCreated={(gorev) => {
          if (source !== "firebase") setGorevler((prev) => [gorev, ...prev]);
        }}
        onSuccess={() => toast.success("Görev listesi güncellendi")}
      />
      <GorevDetayDrawer
        gorev={seciliGorev}
        onClose={() => setSeciliGorev(null)}
        onDurumGuncelle={handleDurumGuncelle}
        onNotEkle={handleNotEkle}
        onGorevGuncelle={handleGorevGuncelle}
        onGorevSil={handleGorevSil}
      />
    </>
  );
}
