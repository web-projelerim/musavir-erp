"use client";

import { useEffect, useState } from "react";
import { CheckCircle, FileText, PlayCircle, RefreshCw, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import {
  Badge,
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
  tebligatAksiyonDurumLabel,
  tebligatAksiyonLabel,
  tebligatKalanGun,
  tebligatSlaLabel,
  tebligatSlaVariant,
} from "@/lib/domain/tebligatSla";
import { useToast } from "@/lib/context/ToastContext";
import { useAuth } from "@/lib/context/AuthContext";
import { canViewVknTckn, displayVknTckn } from "@/lib/utils/maskData";
import { authHeaders, isFirebaseConfigured } from "@/lib/firebase/client";
import { updateTebligat } from "@/lib/firebase/repositories";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { downloadPdfBlob } from "@/lib/reports/pdfReport";
import { buildTebligatPdfBlob, tebligatPdfFileName } from "@/lib/reports/tebligatPdf";
import type { Tebligat } from "@/lib/types";
import { formatTarih } from "@/lib/utils/format";

export default function TebligatlarPage() {
  const toast = useToast();
  const { user } = useAuth();
  const logAudit = useAuditLog();
  const [filterDurum, setFilterDurum] = useState("tumu");
  const { tebligatlar: loadedTebligatlar, belgeler, gibEntegrasyonAyarlari, loading } = useAppData();
  const [tebligatlar, setTebligatlar] = useState<Tebligat[]>(loadedTebligatlar);
  const [seciliTebligat, setSeciliTebligat] = useState<Tebligat | null>(null);

  // GİB sync state
  const [captchaModal, setCaptchaModal] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaImageBase64, setCaptchaImageBase64] = useState("");
  const [captchaImageID, setCaptchaImageID] = useState("");
  const [captchaDk, setCaptchaDk] = useState("");
  const [gibSyncLoading, setGibSyncLoading] = useState(false);

  useEffect(() => {
    setTebligatlar(loadedTebligatlar);
  }, [loadedTebligatlar]);

  /* ── GİB Tebligat Sync ── */

  const openCaptchaModal = async () => {
    setCaptchaDk("");
    setCaptchaImageBase64("");
    setCaptchaImageID("");
    setCaptchaLoading(true);
    setCaptchaModal(true);
    try {
      const res = await fetch("/api/gib/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Captcha alınamadı");
      setCaptchaImageBase64(data.imageBase64);
      setCaptchaImageID(data.imageID);
    } catch (err) {
      toast.error("GİB captcha alınamadı", err instanceof Error ? err.message : undefined);
      setCaptchaModal(false);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleGibSync = async () => {
    const ofisId = gibEntegrasyonAyarlari[0]?.ofisId ?? user?.ofisId ?? "";
    setGibSyncLoading(true);
    try {
      const res = await fetch("/api/gib/bulk-sync", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ofisId, syncTipi: "tebligat" }),
      });
      const data = await res.json();
      if (res.ok && data.needsCaptcha) {
        setGibSyncLoading(false);
        await openCaptchaModal();
        return;
      }
      if (!res.ok) {
        toast.error("GİB sync başarısız", data.error ?? "Sunucu hatası");
        return;
      }
      const { toplamKayit = 0, hataSayisi = 0, islenenMusteriSayisi = 0, mesaj } = data;
      if (mesaj && islenenMusteriSayisi === 0) {
        toast.info("GİB sync", mesaj);
      } else if (hataSayisi === 0) {
        toast.success("GİB tebligat sync tamamlandı", `${islenenMusteriSayisi} müşteri — ${toplamKayit} tebligat güncellendi`);
      } else if (toplamKayit > 0) {
        toast.warning("Kısmi sync", `${toplamKayit} tebligat güncellendi, ${hataSayisi} müşteride hata`);
      } else {
        toast.error("GİB sync başarısız", "Tüm müşterilerde hata. GİB kimlik bilgilerini kontrol edin");
      }
    } catch (err) {
      toast.error("GİB sync hatası", err instanceof Error ? err.message : undefined);
    } finally {
      setGibSyncLoading(false);
    }
  };

  const handleRefreshCaptcha = async () => {
    setCaptchaDk("");
    setCaptchaImageBase64("");
    setCaptchaImageID("");
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/gib/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Captcha alınamadı");
      setCaptchaImageBase64(data.imageBase64);
      setCaptchaImageID(data.imageID);
    } catch (err) {
      toast.error("GİB captcha alınamadı", err instanceof Error ? err.message : undefined);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const executeGibSync = async () => {
    setCaptchaModal(false);
    setGibSyncLoading(true);
    const ofisId = gibEntegrasyonAyarlari[0]?.ofisId ?? user?.ofisId ?? "";
    try {
      const res = await fetch("/api/gib/bulk-sync", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ ofisId, captchaDk, captchaImageID, syncTipi: "tebligat" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("GİB sync başarısız", data.error ?? "Sunucu hatası");
        return;
      }
      const { toplamKayit = 0, hataSayisi = 0, islenenMusteriSayisi = 0 } = data;
      if (hataSayisi === 0) {
        toast.success("GİB tebligat sync tamamlandı", `${islenenMusteriSayisi} müşteri — ${toplamKayit} tebligat güncellendi`);
      } else {
        toast.warning("Kısmi sync", `${toplamKayit} tebligat, ${hataSayisi} müşteride hata`);
      }
    } catch (err) {
      toast.error("GİB sync hatası", err instanceof Error ? err.message : undefined);
    } finally {
      setGibSyncLoading(false);
    }
  };

  const handleCaptchaConfirm = async () => {
    if (!captchaDk.trim()) return;
    await executeGibSync();
  };

  const handleTebligatPdf = async (tebligat: Tebligat) => {
    const belgePdf = belgeler.find(
      (belge) =>
        belge.musteriId === tebligat.musteriId &&
        belge.kategori === "tebligat" &&
        (belge.notlar?.includes(tebligat.id) || belge.dosyaAdi.toLowerCase().includes(tebligat.id.toLowerCase()))
    );
    const pdfUrl = tebligat.pdfUrl || belgePdf?.url;

    // GİB PDF varsa kendi viewer sayfamızda aç (CORS sorunsuz proxy üzerinden)
    if (tebligat.pdfUrl) {
      window.location.href = `/tebligatlar/${tebligat.id}`;
      return;
    }

    if (pdfUrl && pdfUrl !== "#") {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      toast.success("Tebligat PDF'i açıldı");
      return;
    }

    const blob = await buildTebligatPdfBlob(tebligat, !canViewVknTckn(user));
    downloadPdfBlob(blob, tebligatPdfFileName(tebligat));
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
        summary: "Tebligat işlendi olarak işaretlendi",
        before: tebligat ? { durum: tebligat.durum } : undefined,
        after: { durum: "islendi", aksiyonDurumu: "tamamlandi" },
      });
      toast.success("Tebligat işlendi olarak işaretlendi");
    } catch (error) {
      console.error(error);
      toast.error("Tebligat güncellenemedi", parseFirestoreError(error));
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
      toast.success(`Tebligat aksiyonu "${tebligatAksiyonDurumLabel(nextDurum)}" durumuna alındı`);
      return;
    }

    try {
      await updateTebligat(id, { aksiyonDurumu: nextDurum });
      await logAudit({
        action: "status_change",
        entityType: "tebligat",
        entityId: id,
        entityLabel: tebligat.baslik,
        summary: `Tebligat aksiyonu ${nextDurum} durumuna güncellendi`,
        before: { aksiyonDurumu: tebligat.aksiyonDurumu },
        after: { aksiyonDurumu: nextDurum },
      });
      toast.success(`Tebligat aksiyonu "${tebligatAksiyonDurumLabel(nextDurum)}" durumuna alındı`);
    } catch (error) {
      console.error(error);
      toast.error("Tebligat aksiyonu güncellenemedi", parseFirestoreError(error));
    }
  };

  const filteredTebligatlar = tebligatlar.filter(
    (item) => filterDurum === "tumu" || item.durum === filterDurum
  );

  const kritikSla = tebligatlar.filter(
    (item) => item.aksiyonDurumu !== "tamamlandi" && (tebligatKalanGun(item) ?? 99) <= 0
  ).length;
  const aksiyonBekleyen = tebligatlar.filter((item) => item.aksiyonDurumu !== "tamamlandi").length;

  const metrics = [
    { title: "Toplam Tebligat", value: tebligatlar.length, subtitle: "Bu dönem" },
    {
      title: "Yeni Tebligat",
      value: tebligatlar.filter((item) => item.durum === "yeni").length,
      subtitle: "İşlem bekliyor",
      variant: "danger" as const,
    },
    {
      title: "Kritik SLA",
      value: kritikSla,
      subtitle: "Bugün veya geçmiş son gün",
      variant: kritikSla > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      title: "Aksiyon Kuyruğu",
      value: aksiyonBekleyen,
      subtitle: "Tamamlanmamış tebligat aksiyonu",
      variant: "danger" as const,
    },
  ];

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Tebligatlar"
        subtitle="GİB kaynaklı resmi bildirimler"
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Tebligatlar" }]}
        action={
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${gibSyncLoading ? "animate-spin" : ""}`} />}
            loading={gibSyncLoading}
            onClick={handleGibSync}
            title="GİB IVD'den tebligatları çek"
          >
            GİB Getir
          </Button>
        }
      />

      <StatsDrawer
        title="Tebligat Özeti"
        subtitle="Resmi bildirim durumları"
        metrics={metrics}
      />

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <select
            value={filterDurum}
            onChange={(event) => setFilterDurum(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tüm Durumlar</option>
            <option value="yeni">Yeni</option>
            <option value="okundu">Okundu</option>
            <option value="islendi">İşlendi</option>
            <option value="bekliyor">Bekliyor</option>
          </select>
          <span className="text-xs text-slate-500">{filteredTebligatlar.length} kayıt</span>
        </div>
      </div>

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
                    <p className="mt-1 text-xs font-mono text-slate-400">{displayVknTckn(tebligat.vknTckn, user)}</p>
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
                      Tebliğ edilmiş sayılma:{" "}
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
                      Yapılacak iş:{" "}
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
                      {tebligat.aksiyonDurumu === "bekliyor" ? "İşleme Al" : "Aksiyonu Tamamla"}
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
                      İşlendi
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
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>VKN/TCKN</TableHeadCell>
              <TableHeadCell>Başlık</TableHeadCell>
              <TableHeadCell>Tür</TableHeadCell>
              <TableHeadCell>SLA</TableHeadCell>
              <TableHeadCell>Aksiyon</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
              <TableHeadCell>İşlem</TableHeadCell>
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
                      <span className="text-xs font-mono text-slate-500">{displayVknTckn(tebligat.vknTckn, user)}</span>
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
                          title="PDF görüntüle"
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
                            title="İşlendi olarak işaretle"
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

      <TebligatDetayModal
        tebligat={seciliTebligat}
        onClose={() => setSeciliTebligat(null)}
        onPdf={handleTebligatPdf}
        onIslendi={handleTebligatIslendi}
        onAksiyon={handleTebligatAksiyon}
      />

      {/* ─── GİB Captcha Modal ─────────────────────────────────────────── */}
      {captchaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">GİB Güvenlik Doğrulaması</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tebligatları çekmek için kodu girin</p>
              </div>
              <button
                onClick={() => setCaptchaModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              {captchaLoading ? (
                <div className="w-48 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : captchaImageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element -- base64 data URI captcha; next/image optimizasyonu gereksiz
                <img
                  src={`data:image/jpeg;base64,${captchaImageBase64}`}
                  alt="GİB güvenlik kodu"
                  className="rounded-lg border border-slate-200 h-16 object-contain"
                />
              ) : (
                <div className="w-48 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                  Captcha yüklenemedi
                </div>
              )}
              <button
                type="button"
                onClick={handleRefreshCaptcha}
                disabled={captchaLoading}
                className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
              >
                Yenile
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Güvenlik Kodu</label>
              <Input
                value={captchaDk}
                onChange={(e) => setCaptchaDk(e.target.value)}
                placeholder="Resimdeki kodu girin"
                onKeyDown={(e) => { if (e.key === "Enter") handleCaptchaConfirm(); }}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setCaptchaModal(false)}
              >
                İptal
              </Button>
              <Button
                className="flex-1"
                disabled={!captchaDk.trim() || captchaLoading}
                onClick={handleCaptchaConfirm}
              >
                Tebligatları Çek
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
