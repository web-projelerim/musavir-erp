"use client";

import { useEffect, useState } from "react";
import { CheckCircle, FileText, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import {
  Badge,
  BeyannameBadge,
  BeyanWorkflowBadge,
  TebligatAksiyonBadge,
  TebligatBadge,
} from "@/components/ui/Badge";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { TebligatDetayModal } from "@/components/modals/TebligatDetayModal";
import {
  buildBeyanWorkflowPatch,
  mapLegacyDurumToWorkflow,
  nextWorkflowStep,
  workflowActionLabel,
} from "@/lib/domain/beyanWorkflow";
import {
  tebligatAksiyonDurumLabel,
  tebligatAksiyonLabel,
  tebligatKalanGun,
  tebligatSlaLabel,
  tebligatSlaVariant,
} from "@/lib/domain/tebligatSla";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updateBeyannameDurum, updateBeyannameWorkflow, updateTebligat } from "@/lib/firebase/repositories";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { downloadPdfBlob } from "@/lib/reports/pdfReport";
import { buildTebligatPdfBlob, tebligatPdfFileName } from "@/lib/reports/tebligatPdf";
import type { Beyanname, BeyannameDurum, Tebligat } from "@/lib/types";
import { formatTarih } from "@/lib/utils/format";

const TABS = ["Tebligatlar", "Beyannameler"];

export default function TebligatlarPage() {
  const toast = useToast();
  const logAudit = useAuditLog();
  const [activeTab, setActiveTab] = useState("Tebligatlar");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const { tebligatlar: loadedTebligatlar, beyannameler: loadedBeyannameler, belgeler, loading } = useAppData();
  const [tebligatlar, setTebligatlar] = useState<Tebligat[]>(loadedTebligatlar);
  const [beyannameler, setBeyannameler] = useState<Beyanname[]>(loadedBeyannameler);
  const [seciliTebligat, setSeciliTebligat] = useState<Tebligat | null>(null);

  useEffect(() => {
    setTebligatlar(loadedTebligatlar);
  }, [loadedTebligatlar]);

  useEffect(() => {
    setBeyannameler(loadedBeyannameler);
  }, [loadedBeyannameler]);

  const handleTebligatPdf = (tebligat: Tebligat) => {
    const belgePdf = belgeler.find(
      (belge) =>
        belge.musteriId === tebligat.musteriId &&
        belge.kategori === "tebligat" &&
        (belge.notlar?.includes(tebligat.id) || belge.dosyaAdi.toLowerCase().includes(tebligat.id.toLowerCase()))
    );
    const pdfUrl = tebligat.pdfUrl || belgePdf?.url;

    if (pdfUrl && pdfUrl !== "#") {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      toast.success("Tebligat PDF'i acildi");
      return;
    }

    downloadPdfBlob(buildTebligatPdfBlob(tebligat), tebligatPdfFileName(tebligat));
    toast.info("Takip PDF'i indirildi", "GİB PDF referansı bulunmadığı için sistem dökümanı üretildi");
  };

  const handleTebligatIslendi = async (id: string) => {
    const tebligat = tebligatlar.find((item) => item.id === id);
    setTebligatlar((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, durum: "islendi", aksiyonDurumu: "tamamlandi" } : item
      )
    );
    setSeciliTebligat((prev) =>
      prev?.id === id ? { ...prev, durum: "islendi", aksiyonDurumu: "tamamlandi" } : prev
    );

    if (!isFirebaseConfigured) {
      toast.success("Tebligat işlendi olarak işaretlendi");
      return;
    }

    try {
      await updateTebligat(id, { durum: "islendi", aksiyonDurumu: "tamamlandi" });
      await logAudit({
        action: "status_change",
        entityType: "tebligat",
        entityId: id,
        entityLabel: tebligat?.baslik,
        summary: "Tebligat islendi olarak isaretlendi",
        before: tebligat ? { durum: tebligat.durum } : undefined,
        after: { durum: "islendi", aksiyonDurumu: "tamamlandi" },
      });
      toast.success("Tebligat işlendi olarak işaretlendi");
    } catch (error) {
      console.error(error);
      toast.error("Tebligat güncellenemedi", "Firestore yetkilerini kontrol edin");
      throw error;
    }
  };

  const handleTebligatAksiyon = async (id: string) => {
    const tebligat = tebligatlar.find((item) => item.id === id);
    if (!tebligat) return;

    const nextDurum =
      tebligat.aksiyonDurumu === "bekliyor"
        ? "islemde"
        : tebligat.aksiyonDurumu === "islemde"
          ? "tamamlandi"
          : "tamamlandi";

    setTebligatlar((prev) =>
      prev.map((item) => (item.id === id ? { ...item, aksiyonDurumu: nextDurum } : item))
    );
    setSeciliTebligat((prev) => (prev?.id === id ? { ...prev, aksiyonDurumu: nextDurum } : prev));

    if (!isFirebaseConfigured) {
      toast.success(`Tebligat aksiyonu "${tebligatAksiyonDurumLabel(nextDurum)}" durumuna alindi`);
      return;
    }

    try {
      await updateTebligat(id, { aksiyonDurumu: nextDurum });
      await logAudit({
        action: "status_change",
        entityType: "tebligat",
        entityId: id,
        entityLabel: tebligat.baslik,
        summary: `Tebligat aksiyonu ${nextDurum} durumuna guncellendi`,
        before: { aksiyonDurumu: tebligat.aksiyonDurumu },
        after: { aksiyonDurumu: nextDurum },
      });
      toast.success(`Tebligat aksiyonu "${tebligatAksiyonDurumLabel(nextDurum)}" durumuna alindi`);
    } catch (error) {
      console.error(error);
      toast.error("Tebligat aksiyonu guncellenemedi", "Firestore yetkilerini kontrol edin");
    }
  };

  const handleBeyannameDurum = async (id: string, durum: BeyannameDurum) => {
    setBeyannameler((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              durum,
              yasamDongusuDurum: mapLegacyDurumToWorkflow(durum),
              verilmeTarihi: durum === "verildi" ? new Date().toISOString() : item.verilmeTarihi,
            }
          : item
      )
    );

    if (!isFirebaseConfigured) {
      toast.info("Demo modu", "Beyanname durumu yerelde güncellendi");
      return;
    }

    try {
      await updateBeyannameDurum(id, durum);
      const beyanname = beyannameler.find((item) => item.id === id);
      await logAudit({
        action: "status_change",
        entityType: "beyanname",
        entityId: id,
        entityLabel: beyanname ? `${beyanname.tur} - ${beyanname.donem}` : undefined,
        summary: `Beyanname durumu ${durum} olarak guncellendi`,
        before: beyanname ? { durum: beyanname.durum } : undefined,
        after: { durum },
      });
      toast.success(`Beyanname durumu "${durum}" olarak guncellendi`);
    } catch (error) {
      console.error(error);
      toast.error("Beyanname guncellenemedi", "Firestore yetkilerini kontrol edin");
    }
  };

  const handleBeyanWorkflowStep = async (beyanname: Beyanname) => {
    const next = nextWorkflowStep(beyanname.yasamDongusuDurum);
    if (!next) return;

    const patch = buildBeyanWorkflowPatch(beyanname, next);
    setBeyannameler((prev) =>
      prev.map((item) => (item.id === beyanname.id ? { ...item, ...patch } : item))
    );

    if (!isFirebaseConfigured) {
      toast.success(`Beyanname akisi "${workflowActionLabel(beyanname.yasamDongusuDurum)}" adimina ilerletildi`);
      return;
    }

    try {
      await updateBeyannameWorkflow(beyanname.id, next, patch);
      await logAudit({
        action: "status_change",
        entityType: "beyanname",
        entityId: beyanname.id,
        entityLabel: `${beyanname.tur} - ${beyanname.donem}`,
        summary: `Beyanname akis adimi ${next} olarak guncellendi`,
        before: {
          yasamDongusuDurum: beyanname.yasamDongusuDurum,
          durum: beyanname.durum,
        },
        after: patch as Record<string, unknown>,
      });
      toast.success(`Beyanname akisi "${workflowActionLabel(beyanname.yasamDongusuDurum)}" adimina ilerletildi`);
    } catch (error) {
      console.error(error);
      toast.error("Beyan workflow guncellenemedi", "Firestore yetkilerini kontrol edin");
    }
  };

  const filteredTebligatlar = tebligatlar.filter((item) => filterDurum === "tumu" || item.durum === filterDurum);
  const filteredBeyanlar = beyannameler.filter((item) => filterDurum === "tumu" || item.durum === filterDurum);
  const kritikSla = tebligatlar.filter(
    (item) => item.aksiyonDurumu !== "tamamlandi" && (tebligatKalanGun(item) ?? 99) <= 0
  ).length;
  const aksiyonBekleyen = tebligatlar.filter((item) => item.aksiyonDurumu !== "tamamlandi").length;

  const metrics = [
    { title: "Toplam Tebligat", value: tebligatlar.length, subtitle: "Bu donem" },
    {
      title: "Yeni Tebligat",
      value: tebligatlar.filter((item) => item.durum === "yeni").length,
      subtitle: "Islem bekliyor",
      variant: "danger" as const,
    },
    {
      title: "Kritik SLA",
      value: kritikSla,
      subtitle: "Bugun veya gecmis son gun",
      variant: kritikSla > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      title: "Aksiyon Kuyrugu",
      value: aksiyonBekleyen,
      subtitle: "Tamamlanmamis tebligat aksiyonu",
      variant: "danger" as const,
    },
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Tebligat & Beyanname Takibi"
        subtitle="GIB kaynakli resmi bildirimler ve beyanname durumlari"
      />

      <StatsDrawer
        title="Tebligat ve Beyan Ozeti"
        subtitle="Resmi bildirim ve beyanname durumlari"
        metrics={metrics}
      />

      <div className="mb-5 border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
              {tab === "Tebligatlar" && (
                <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                  {tebligatlar.filter((item) => item.durum === "yeni").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <select
            value={filterDurum}
            onChange={(event) => setFilterDurum(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tum Durumlar</option>
            {activeTab === "Tebligatlar" ? (
              <>
                <option value="yeni">Yeni</option>
                <option value="okundu">Okundu</option>
                <option value="islendi">Islendi</option>
                <option value="bekliyor">Bekliyor</option>
              </>
            ) : (
              <>
                <option value="verildi">Verildi</option>
                <option value="bekliyor">Bekliyor</option>
                <option value="gecikti">Gecikti</option>
              </>
            )}
          </select>
          <span className="text-xs text-slate-500">
            {activeTab === "Tebligatlar" ? filteredTebligatlar.length : filteredBeyanlar.length} kayit
          </span>
        </div>
      </div>

      {activeTab === "Tebligatlar" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <MobileList empty={filteredTebligatlar.length === 0}>
            {filteredTebligatlar.map((tebligat) => {
              const kalanGun = tebligatKalanGun(tebligat);

              return (
                <MobileCard key={tebligat.id} onClick={() => setSeciliTebligat(tebligat)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{tebligat.baslik}</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">{tebligat.musteriAdi}</p>
                      <p className="mt-1 text-xs font-mono text-slate-400">{tebligat.vknTckn}</p>
                    </div>
                    <TebligatBadge durum={tebligat.durum} />
                  </div>
                  {tebligat.notlar && <p className="mt-2 text-xs text-amber-600">{tebligat.notlar}</p>}

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <MobileField label="Tarih">{formatTarih(tebligat.tarih)}</MobileField>
                    <MobileField label="Tür">
                      <Badge variant="neutral">{tebligat.tur}</Badge>
                    </MobileField>
                    <MobileField label="SLA">
                      <Badge variant={tebligatSlaVariant(kalanGun, tebligat.aksiyonDurumu)}>
                        {tebligatSlaLabel(kalanGun, tebligat.aksiyonDurumu)}
                      </Badge>
                    </MobileField>
                    <MobileField label="Aksiyon">
                      {tebligat.aksiyonDurumu ? <TebligatAksiyonBadge durum={tebligat.aksiyonDurumu} /> : "-"}
                    </MobileField>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                      <p>
                        Teblig edilmis sayilma:{" "}
                        <span className="font-medium text-slate-800">
                          {tebligat.tebligEdilmisSayilmaTarihi
                            ? formatTarih(tebligat.tebligEdilmisSayilmaTarihi)
                            : "-"}
                        </span>
                      </p>
                      <p>
                        Kritik son tarih:{" "}
                        <span className="font-medium text-slate-800">
                          {tebligat.kritikSonTarih ? formatTarih(tebligat.kritikSonTarih) : "-"}
                        </span>
                      </p>
                      <p>
                        Yapilacak is:{" "}
                        <span className="font-medium text-slate-800">
                          {tebligatAksiyonLabel(tebligat.aksiyonTipi)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {tebligat.aksiyonDurumu !== "tamamlandi" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTebligatAksiyon(tebligat.id);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        {tebligat.aksiyonDurumu === "bekliyor" ? "Isleme Al" : "Aksiyonu Tamamla"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleTebligatPdf(tebligat);
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    {tebligat.durum !== "islendi" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTebligatIslendi(tebligat.id);
                        }}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Islendi
                      </button>
                    )}
                  </div>
                </MobileCard>
              );
            })}
          </MobileList>

          <Table className="hidden md:block">
            <TableHead>
              <tr>
                <TableHeadCell>Tarih</TableHeadCell>
                <TableHeadCell>Musteri</TableHeadCell>
                <TableHeadCell>VKN/TCKN</TableHeadCell>
                <TableHeadCell>Baslik</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>SLA</TableHeadCell>
                <TableHeadCell>Aksiyon</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Islem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredTebligatlar.length === 0 ? (
                <TableEmpty colSpan={9} />
              ) : (
                filteredTebligatlar.map((tebligat) => {
                  const kalanGun = tebligatKalanGun(tebligat);

                  return (
                    <TableRow key={tebligat.id} onClick={() => setSeciliTebligat(tebligat)}>
                      <TableCell>
                        <span className="text-xs font-medium text-slate-700">{formatTarih(tebligat.tarih)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-800">{tebligat.musteriAdi}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-slate-500">{tebligat.vknTckn}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium text-slate-800">{tebligat.baslik}</p>
                          {tebligat.notlar && <p className="mt-0.5 text-xs text-amber-600">{tebligat.notlar}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{tebligat.tur}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={tebligatSlaVariant(kalanGun, tebligat.aksiyonDurumu)}>
                            {tebligatSlaLabel(kalanGun, tebligat.aksiyonDurumu)}
                          </Badge>
                          {tebligat.kritikSonTarih && (
                            <span className="text-[11px] text-slate-400">{formatTarih(tebligat.kritikSonTarih)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tebligat.aksiyonDurumu && <TebligatAksiyonBadge durum={tebligat.aksiyonDurumu} />}
                          {tebligat.aksiyonTipi && (
                            <span className="text-[11px] text-slate-400">
                              {tebligatAksiyonLabel(tebligat.aksiyonTipi)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TebligatBadge durum={tebligat.durum} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {tebligat.aksiyonDurumu !== "tamamlandi" && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleTebligatAksiyon(tebligat.id);
                              }}
                              className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                              title="Aksiyon ilerlet"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleTebligatPdf(tebligat);
                            }}
                            className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                            title="PDF goruntule"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          {tebligat.durum !== "islendi" && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleTebligatIslendi(tebligat.id);
                              }}
                              className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50"
                              title="Islendi olarak isaretle"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "Beyannameler" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <MobileList empty={filteredBeyanlar.length === 0}>
            {filteredBeyanlar.map((beyanname) => (
              <MobileCard key={beyanname.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{beyanname.musteriAdi}</p>
                    <p className="mt-1 text-xs text-slate-500">{beyanname.donem}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <BeyannameBadge durum={beyanname.durum} />
                    <BeyanWorkflowBadge durum={beyanname.yasamDongusuDurum} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MobileField label="Tur">
                    <Badge variant="info">{beyanname.tur}</Badge>
                  </MobileField>
                  <MobileField label="Son Tarih">
                    <span
                      className={
                        beyanname.durum === "gecikti"
                          ? "font-semibold text-red-600"
                          : "font-semibold text-slate-800"
                      }
                    >
                      {formatTarih(beyanname.sonTarih)}
                    </span>
                  </MobileField>
                  <MobileField label="Verilme Tarihi">
                    {beyanname.verilmeTarihi ? formatTarih(beyanname.verilmeTarihi) : "-"}
                  </MobileField>
                  <MobileField label="Sorumlu">{beyanname.sorumlu}</MobileField>
                  <MobileField label="Kaynak">{beyanname.kaynakSistem ?? "-"}</MobileField>
                </div>
                {(beyanname.tahakkukFisNo || beyanname.odemeSonTarihi) && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {beyanname.tahakkukFisNo && (
                      <p className="text-xs text-slate-600">Tahakkuk Fisi: {beyanname.tahakkukFisNo}</p>
                    )}
                    {beyanname.odemeSonTarihi && (
                      <p className="mt-1 text-xs text-slate-500">
                        Odeme Son Tarihi: {formatTarih(beyanname.odemeSonTarihi)}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {nextWorkflowStep(beyanname.yasamDongusuDurum) && (
                    <button
                      type="button"
                      onClick={() => handleBeyanWorkflowStep(beyanname)}
                      className="min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700"
                    >
                      {workflowActionLabel(beyanname.yasamDongusuDurum)}
                    </button>
                  )}
                  {beyanname.durum !== "verildi" && (
                    <button
                      type="button"
                      onClick={() => handleBeyannameDurum(beyanname.id, "verildi")}
                      className="min-h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700"
                    >
                      Verildi
                    </button>
                  )}
                  {beyanname.durum !== "gecikti" && (
                    <button
                      type="button"
                      onClick={() => handleBeyannameDurum(beyanname.id, "gecikti")}
                      className="min-h-10 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700"
                    >
                      Gecikti
                    </button>
                  )}
                </div>
              </MobileCard>
            ))}
          </MobileList>

          <Table className="hidden md:block">
            <TableHead>
              <tr>
                <TableHeadCell>Musteri</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Donem</TableHeadCell>
                <TableHeadCell>Son Tarih</TableHeadCell>
                <TableHeadCell>Workflow</TableHeadCell>
                <TableHeadCell>Verilme Tarihi</TableHeadCell>
                <TableHeadCell>Tahakkuk</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Islem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredBeyanlar.length === 0 ? (
                <TableEmpty colSpan={10} />
              ) : (
                filteredBeyanlar.map((beyanname) => (
                  <TableRow key={beyanname.id}>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-800">{beyanname.musteriAdi}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{beyanname.tur}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{beyanname.donem}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          beyanname.durum === "gecikti" ? "text-red-600" : "text-slate-800"
                        }`}
                      >
                        {formatTarih(beyanname.sonTarih)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <BeyanWorkflowBadge durum={beyanname.yasamDongusuDurum} />
                        {beyanname.kaynakSistem && (
                          <span className="text-[11px] text-slate-400">{beyanname.kaynakSistem}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {beyanname.verilmeTarihi ? (
                        <span className="text-xs text-emerald-600">{formatTarih(beyanname.verilmeTarihi)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {beyanname.tahakkukFisNo ? (
                        <div>
                          <p className="text-xs font-medium text-slate-700">{beyanname.tahakkukFisNo}</p>
                          {beyanname.odemeSonTarihi && (
                            <p className="text-xs text-slate-400">{formatTarih(beyanname.odemeSonTarihi)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{beyanname.sorumlu}</span>
                    </TableCell>
                    <TableCell>
                      <BeyannameBadge durum={beyanname.durum} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {nextWorkflowStep(beyanname.yasamDongusuDurum) && (
                          <button
                            onClick={() => handleBeyanWorkflowStep(beyanname)}
                            className="rounded-lg px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-50"
                          >
                            {workflowActionLabel(beyanname.yasamDongusuDurum)}
                          </button>
                        )}
                        {beyanname.durum !== "verildi" && (
                          <button
                            onClick={() => handleBeyannameDurum(beyanname.id, "verildi")}
                            className="rounded-lg px-2 py-1 text-xs text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            Verildi
                          </button>
                        )}
                        {beyanname.durum !== "gecikti" && (
                          <button
                            onClick={() => handleBeyannameDurum(beyanname.id, "gecikti")}
                            className="rounded-lg px-2 py-1 text-xs text-red-700 transition-colors hover:bg-red-50"
                          >
                            Gecikti
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <TebligatDetayModal
        tebligat={seciliTebligat}
        onClose={() => setSeciliTebligat(null)}
        onPdf={handleTebligatPdf}
        onIslendi={handleTebligatIslendi}
        onAksiyon={handleTebligatAksiyon}
      />
    </div>
  );
}
