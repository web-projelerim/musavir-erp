"use client";

import { useEffect, useState } from "react";
import { Calendar, GripVertical, Plus, Search, Wand2 } from "lucide-react";
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
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
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
import { formatTarih } from "@/lib/utils/format";
import { useToast } from "@/lib/context/ToastContext";
import type { Gorev, GorevDurum, GorevNot, GorevOncelik } from "@/lib/types";

const DURUM_KOLONLAR: { key: GorevDurum; label: string; color: string }[] = [
  { key: "beklemede", label: "Beklemede", color: "border-slate-300" },
  { key: "devam", label: "Devam ediyor", color: "border-blue-400" },
  { key: "tamamlandi", label: "Tamamlandi", color: "border-emerald-400" },
  { key: "iptal", label: "Iptal", color: "border-red-300" },
];

const ONCELIK_RENK: Record<GorevOncelik, string> = {
  dusuk: "border-l-slate-300",
  normal: "border-l-blue-400",
  yuksek: "border-l-amber-400",
  kritik: "border-l-red-500",
};

export default function GorevlerPage() {
  const toast = useToast();
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
        summary: `Gorev durumu ${durum} olarak guncellendi`,
        after: { durum },
      });
    } catch (error) {
      console.error(error);
      toast.error("Gorev durumu kaydedilemedi");
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
        summary: "Gorev bilgileri guncellendi",
        after: patch as Record<string, unknown>,
      });
    } catch (error) {
      console.error(error);
      toast.error("Gorev guncellemesi kaydedilemedi");
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
        summary: "Goreve not eklendi",
        after: { notSayisi: guncelNotlar.length },
      });
    } catch (error) {
      console.error(error);
      toast.error("Gorev notu kaydedilemedi");
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
        summary: "Gorev silindi",
        before: silinenGorev as unknown as Record<string, unknown>,
      });
    } catch (error) {
      console.error(error);
      toast.error("Gorev silinemedi");
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
      toast.info("Oneri yok", "Acil goreve donusturulecek yeni sinyal bulunmuyor");
      return;
    }

    setOtomatikLoading(true);
    try {
      const created = await Promise.all(
        otomatikOneriler.map(async (oneri, index) => {
          const input = gorevInputFromOneri(oneri);

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
            summary: "Otomatik gorev olusturuldu",
            after: {
              tip: gorev.tip,
              oncelik: gorev.oncelik,
              musteriId: gorev.musteriId,
            },
          })
        )
      );
      toast.success(`${created.length} otomatik gorev olusturuldu`);
    } catch (error) {
      console.error(error);
      toast.error("Otomatik gorevler olusturulamadi", "Firestore yetkilerini veya baglantiyi kontrol edin");
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
          title="Gorev Yonetimi"
          subtitle={`${bekleyenSayi} bekleyen gorev`}
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
                Yeni Gorev
              </Button>
            </div>
          }
        />

        {otomatikOneriler.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Otomatik gorev onerileri</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {otomatikOneriler.length} sinyal goreve donusturulmeye hazir.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={<Wand2 className="w-3.5 h-3.5" />}
                loading={otomatikLoading}
                onClick={handleOtomatikGorevOlustur}
              >
                Tumunu Olustur
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
                placeholder="Gorev veya musteri ara..."
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
              <option value="tumu">Tum Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="devam">Devam Ediyor</option>
              <option value="tamamlandi">Tamamlandi</option>
              <option value="iptal">Iptal</option>
            </select>
            <select
              value={filterOncelik}
              onChange={(e) => setFilterOncelik(e.target.value)}
              className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
            >
              <option value="tumu">Tum Oncelikler</option>
              <option value="kritik">Kritik</option>
              <option value="yuksek">Yuksek</option>
              <option value="normal">Normal</option>
              <option value="dusuk">Dusuk</option>
            </select>
            <span className="text-xs text-slate-500 ml-auto">{filtered.length} gorev</span>
          </div>
        </div>

        {view === "kanban" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {DURUM_KOLONLAR.map((kolon) => {
              const kolonGorevler = filtered.filter((gorev) => gorev.durum === kolon.key);
              return (
                <div
                  key={kolon.key}
                  className="flex flex-col gap-3 min-h-32"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const gorevId = e.dataTransfer.getData("text/plain");
                    if (gorevId) handleDurumGuncelle(gorevId, kolon.key);
                  }}
                >
                  <div className={`flex items-center justify-between pb-2 border-b-2 ${kolon.color}`}>
                    <span className="text-sm font-semibold text-slate-700">{kolon.label}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {kolonGorevler.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {kolonGorevler.map((gorev) => (
                      <div
                        key={gorev.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", gorev.id)}
                        onClick={() => setSeciliGorev(gorev)}
                        className={`bg-white rounded-xl border border-slate-200 p-3.5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border-l-4 ${ONCELIK_RENK[gorev.oncelik]}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 leading-snug mb-2">{gorev.baslik}</p>
                            <p className="text-xs text-blue-600 font-medium mb-2.5">{gorev.musteriAdi}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {formatTarih(gorev.terminTarihi)}
                          </div>
                          <Badge
                            variant={
                              gorev.oncelik === "kritik" ? "danger" :
                              gorev.oncelik === "yuksek" ? "warning" : "neutral"
                            }
                          >
                            {gorev.oncelik}
                          </Badge>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-bold">
                              {gorev.atananKisi.split(" ").map((name) => name[0]).join("")}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">{gorev.atananKisi}</span>
                        </div>
                      </div>
                    ))}
                    {kolonGorevler.length === 0 && (
                      <div
                        onClick={() => setShowYeniModal(true)}
                        className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-300 hover:text-blue-500 transition-colors"
                      >
                        + Gorev ekle
                      </div>
                    )}
                  </div>
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
                  <TableHeadCell>Gorev</TableHeadCell>
                  <TableHeadCell>Musteri</TableHeadCell>
                  <TableHeadCell>Tur</TableHeadCell>
                  <TableHeadCell>Oncelik</TableHeadCell>
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
        onSuccess={() => toast.success("Gorev listesi guncellendi")}
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
