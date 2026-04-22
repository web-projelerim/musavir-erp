"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import { Badge, BeyannameBadge, TebligatBadge } from "@/components/ui/Badge";
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
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updateBeyannameDurum, updateTebligatDurum } from "@/lib/firebase/repositories";
import { useToast } from "@/lib/context/ToastContext";
import { downloadPdfBlob } from "@/lib/reports/pdfReport";
import { buildTebligatPdfBlob, tebligatPdfFileName } from "@/lib/reports/tebligatPdf";
import { formatTarih } from "@/lib/utils/format";
import type { BeyannameDurum, Tebligat } from "@/lib/types";

const TABS = ["Tebligatlar", "Beyannameler"];

export default function TebligatlarPage() {
  const toast = useToast();
  const logAudit = useAuditLog();
  const [activeTab, setActiveTab] = useState("Tebligatlar");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const { tebligatlar: loadedTebligatlar, beyannameler, belgeler } = useAppData();
  const [tebligatlar, setTebligatlar] = useState<Tebligat[]>(loadedTebligatlar);
  const [seciliTebligat, setSeciliTebligat] = useState<Tebligat | null>(null);

  useEffect(() => {
    setTebligatlar(loadedTebligatlar);
  }, [loadedTebligatlar]);

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
    toast.info("Takip PDF'i indirildi", "GIB PDF referansi bulunmadigi icin sistem dokumu uretildi");
  };

  const handleTebligatIslendi = async (id: string) => {
    const tebligat = tebligatlar.find((item) => item.id === id);
    setTebligatlar((prev) =>
      prev.map((tebligat) => (tebligat.id === id ? { ...tebligat, durum: "islendi" } : tebligat))
    );
    setSeciliTebligat((prev) => (prev?.id === id ? { ...prev, durum: "islendi" } : prev));

    if (!isFirebaseConfigured) {
      toast.success("Tebligat islendi olarak isaretlendi");
      return;
    }

    try {
      await updateTebligatDurum(id, "islendi");
      await logAudit({
        action: "status_change",
        entityType: "tebligat",
        entityId: id,
        entityLabel: tebligat?.baslik,
        summary: "Tebligat islendi olarak isaretlendi",
        before: tebligat ? { durum: tebligat.durum } : undefined,
        after: { durum: "islendi" },
      });
      toast.success("Tebligat islendi olarak isaretlendi");
    } catch (error) {
      console.error(error);
      toast.error("Tebligat guncellenemedi", "Firestore yetkilerini kontrol edin");
      throw error;
    }
  };

  const handleBeyannameDurum = async (id: string, durum: BeyannameDurum) => {
    if (!isFirebaseConfigured) {
      toast.info("Demo modu", "Firebase env girilince bu islem Firestore'a kaydedilecek");
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

  const filteredTebligatlar = tebligatlar.filter(
    (t) => filterDurum === "tumu" || t.durum === filterDurum
  );
  const filteredBeyanlar = beyannameler.filter(
    (b) => filterDurum === "tumu" || b.durum === filterDurum
  );
  const metrics = [
    { title: "Toplam Tebligat", value: tebligatlar.length, subtitle: "Bu donem" },
    {
      title: "Yeni Tebligat",
      value: tebligatlar.filter((t) => t.durum === "yeni").length,
      subtitle: "Islem bekliyor",
      variant: "danger" as const,
    },
    {
      title: "Bekleyen Beyan",
      value: beyannameler.filter((b) => b.durum === "bekliyor").length,
      subtitle: "Son tarih yaklasiyor",
      variant: "warning" as const,
    },
    {
      title: "Geciken Beyan",
      value: beyannameler.filter((b) => b.durum === "gecikti").length,
      subtitle: "Acil islem gerekiyor",
      variant: "danger" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tebligat & Beyanname Takibi"
        subtitle="GIB kaynakli resmi bildirimler ve beyanname durumlari"
      />

      <StatsDrawer
        title="Tebligat ve Beyan Özeti"
        subtitle="Resmi bildirim ve beyanname durumları"
        metrics={metrics}
      />

      <div className="border-b border-slate-200 mb-5">
        <nav className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
              {tab === "Tebligatlar" && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {tebligatlar.filter((t) => t.durum === "yeni").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-5">
        <div className="flex items-center gap-3">
          <select
            value={filterDurum}
            onChange={(e) => setFilterDurum(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tarih</TableHeadCell>
                <TableHeadCell>Musteri</TableHeadCell>
                <TableHeadCell>VKN/TCKN</TableHeadCell>
                <TableHeadCell>Baslik</TableHeadCell>
                <TableHeadCell>Tur</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Islem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredTebligatlar.length === 0 ? (
                <TableEmpty colSpan={7} />
              ) : (
                filteredTebligatlar.map((t) => (
                  <TableRow key={t.id} onClick={() => setSeciliTebligat(t)}>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-700">{formatTarih(t.tarih)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-800">{t.musteriAdi}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-slate-500">{t.vknTckn}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{t.baslik}</p>
                        {t.notlar && <p className="text-xs text-amber-600 mt-0.5">{t.notlar}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{t.tur}</Badge>
                    </TableCell>
                    <TableCell>
                      <TebligatBadge durum={t.durum} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTebligatPdf(t);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="PDF goruntule"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {t.durum !== "islendi" && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleTebligatIslendi(t.id);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Islendi olarak isaretle"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
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

      {activeTab === "Beyannameler" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Musteri</TableHeadCell>
                <TableHeadCell>Tur</TableHeadCell>
                <TableHeadCell>Donem</TableHeadCell>
                <TableHeadCell>Son Tarih</TableHeadCell>
                <TableHeadCell>Verilme Tarihi</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Islem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredBeyanlar.length === 0 ? (
                <TableEmpty colSpan={8} />
              ) : (
                filteredBeyanlar.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-800">{b.musteriAdi}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{b.tur}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{b.donem}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${b.durum === "gecikti" ? "text-red-600" : "text-slate-800"}`}>
                        {formatTarih(b.sonTarih)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {b.verilmeTarihi ? (
                        <span className="text-xs text-emerald-600">{formatTarih(b.verilmeTarihi)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{b.sorumlu}</span>
                    </TableCell>
                    <TableCell>
                      <BeyannameBadge durum={b.durum} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {b.durum !== "verildi" && (
                          <button
                            onClick={() => handleBeyannameDurum(b.id, "verildi")}
                            className="px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            Verildi
                          </button>
                        )}
                        {b.durum !== "gecikti" && (
                          <button
                            onClick={() => handleBeyannameDurum(b.id, "gecikti")}
                            className="px-2 py-1 text-xs text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
      />
    </div>
  );
}
