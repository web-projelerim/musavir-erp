"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Upload } from "lucide-react";
import { BankaEkstresiModal } from "@/components/modals/BankaEkstresiModal";
import { TahakkukModal } from "@/components/modals/TahakkukModal";
import { Button } from "@/components/ui/Button";
import { Card, MetricCard } from "@/components/ui/Card";
import { Badge, TahsilatBadge } from "@/components/ui/Badge";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeadCell,
  TableRow,
} from "@/components/ui/Table";
import { calculateTahakkukDurum, tahakkukKalemLabel, tahakkukTuruLabel } from "@/lib/domain/tahakkuk";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { lucaCSVIndir } from "@/lib/reports/lucaExport";
import { useToast } from "@/lib/context/ToastContext";
import { hasPermission } from "@/lib/utils/permissions";
import { PageLoading } from "@/components/ui/PageLoading";
import type { BankaEkstreSatiri, Tahakkuk } from "@/lib/types";
import { formatPara, formatTarih } from "@/lib/utils/format";

export default function TahakkuklarPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { tahakkuklar, musteriler, gonderimler, bankaEkstreleri, loading } = useAppData();
  const canWrite = hasPermission(user, "tahakkuk_yazma");

  const handleLucaExport = (liste: typeof normalized) => {
    if (liste.length === 0) {
      toast.warning("Dışa aktarılacak tahakkuk yok");
      return;
    }
    lucaCSVIndir(liste, musteriler);
    toast.success("Luca CSV oluşturuldu", `${liste.length} tahakkuk aktarıldı`);
  };
  const [showTahakkukModal, setShowTahakkukModal] = useState(false);
  const [showBankaModal, setShowBankaModal] = useState(false);
  const [localTahakkuklar, setLocalTahakkuklar] = useState<Tahakkuk[]>(tahakkuklar);
  const [filterTur, setFilterTur] = useState<"tumu" | "hizmet" | "vergi">("tumu");
  const [filterDurum, setFilterDurum] = useState<"tumu" | "bekliyor" | "kismi" | "odendi" | "gecikti">("tumu");
  const [filterKaynak, setFilterKaynak] = useState<"tumu" | "manuel" | "otomatik">("tumu");

  useEffect(() => {
    setLocalTahakkuklar(tahakkuklar);
  }, [tahakkuklar]);

  const normalized = useMemo(
    () =>
      localTahakkuklar.map((item) => ({
        ...item,
        durum: calculateTahakkukDurum(item),
      })),
    [localTahakkuklar]
  );

  const total = normalized.reduce((sum, item) => sum + item.tutar, 0);
  const hizmetKayitlari = normalized.filter((item) => item.tahakkukTuru === "hizmet");
  const vergiKayitlari = normalized.filter((item) => item.tahakkukTuru === "vergi");
  const hizmetToplam = hizmetKayitlari.reduce((sum, item) => sum + item.tutar, 0);
  const vergiToplam = vergiKayitlari.reduce((sum, item) => sum + item.tutar, 0);
  const totalPaid = normalized.reduce((sum, item) => sum + (item.odenenTutar ?? 0), 0);
  const pending = normalized.filter((item) => item.durum === "bekliyor" || item.durum === "kismi").length;
  const plannedWhatsApp = gonderimler.filter(
    (item) => item.sablonId === "tahakkuk" && item.durum === "bekliyor"
  ).length;
  const filtered = normalized.filter((item) => {
    if (filterTur !== "tumu" && item.tahakkukTuru !== filterTur) return false;
    if (filterDurum !== "tumu" && item.durum !== filterDurum) return false;
    if (filterKaynak === "otomatik" && !item.otomatikTuretilmis) return false;
    if (filterKaynak === "manuel" && item.otomatikTuretilmis) return false;
    return true;
  });

  const handleBankaSuccess = (matched: BankaEkstreSatiri[]) => {
    setLocalTahakkuklar((prev) =>
      prev.map((tahakkuk) => {
        const payment = matched.find((row) => row.tahakkukId === tahakkuk.id);
        if (!payment) return tahakkuk;
        const paid = (tahakkuk.odenenTutar ?? 0) + payment.tutar;
        return {
          ...tahakkuk,
          odenenTutar: paid,
          durum: paid >= tahakkuk.tutar ? "odendi" : "kismi",
        };
      })
    );
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tahakkuk ve Odemeler"
        subtitle="Ofis hizmet tahakkuklarini ve resmi vergi tahakkuklarini ayri anlamda izleyin"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => handleLucaExport(filtered)}>
              Luca'ya Aktar
            </Button>
            {canWrite && (
              <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => setShowBankaModal(true)}>
                Banka Ekstresi
              </Button>
            )}
            {canWrite && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowTahakkukModal(true)}>
                Yeni Tahakkuk
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <MetricCard title="Hizmet Tahakkugu" value={formatPara(hizmetToplam)} subtitle={`${hizmetKayitlari.length} kayit`} />
        <MetricCard title="Vergi Tahakkugu" value={formatPara(vergiToplam)} subtitle={`${vergiKayitlari.length} resmi kayit`} variant="warning" />
        <MetricCard title="Tahsil Edilen" value={formatPara(totalPaid)} subtitle={`Toplam ${formatPara(total)} icinden`} variant="success" />
        <MetricCard title="Bekleyen" value={pending} subtitle="Odeme veya kismi odeme bekliyor" variant={pending > 0 ? "warning" : "default"} />
        <MetricCard title="Planli WhatsApp" value={plannedWhatsApp} subtitle="Hizmet tahakkugu bildirimi" variant={plannedWhatsApp > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Tahakkuk Listesi</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Hizmet tahakkugu ile vergi tahakkugu ayni ekranda, ama farkli kategori ve kalem mantigi ile izlenir.
            </p>
          </div>
          <Badge variant={bankaEkstreleri.length > 0 ? "info" : "neutral"}>
            {bankaEkstreleri.length} banka importu
          </Badge>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={filterTur}
            onChange={(event) => setFilterTur(event.target.value as typeof filterTur)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tum kategoriler</option>
            <option value="hizmet">Hizmet tahakkugu</option>
            <option value="vergi">Vergi tahakkugu</option>
          </select>
          <select
            value={filterDurum}
            onChange={(event) => setFilterDurum(event.target.value as typeof filterDurum)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tum durumlar</option>
            <option value="bekliyor">Bekliyor</option>
            <option value="kismi">Kismi</option>
            <option value="odendi">Odendi</option>
            <option value="gecikti">Gecikti</option>
          </select>
          <select
            value={filterKaynak}
            onChange={(event) => setFilterKaynak(event.target.value as typeof filterKaynak)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tum kaynaklar</option>
            <option value="manuel">Manuel/acik kayit</option>
            <option value="otomatik">Beyannameden turetilen</option>
          </select>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {filtered.length} kayit gorunuyor
          </div>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Musteri</TableHeadCell>
                <TableHeadCell>Donem</TableHeadCell>
                <TableHeadCell>Kategori</TableHeadCell>
                <TableHeadCell>Kalem</TableHeadCell>
                <TableHeadCell>Tutar</TableHeadCell>
                <TableHeadCell>Odenen</TableHeadCell>
                <TableHeadCell>Vade</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Bildirim</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableEmpty colSpan={9} message="Tahakkuk kaydi bulunamadi" />
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-800">{item.musteriAdi}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{item.donem}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.tahakkukTuru === "vergi" ? "warning" : "neutral"}>
                        {tahakkukTuruLabel(item.tahakkukTuru)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-700">{tahakkukKalemLabel(item)}</span>
                        {item.resmiTahakkukFisNo && (
                          <span className="text-[11px] text-slate-400">{item.resmiTahakkukFisNo}</span>
                        )}
                        {item.otomatikTuretilmis && (
                          <span className="text-[11px] text-blue-500">Beyannameden otomatik turetildi</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-slate-900">{formatPara(item.tutar)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{formatPara(item.odenenTutar ?? 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{formatTarih(item.vadeTarihi)}</span>
                    </TableCell>
                    <TableCell>
                      <TahsilatBadge
                        durum={
                          item.durum === "odendi"
                            ? "odendi"
                            : item.durum === "kismi"
                              ? "kismi"
                              : item.durum === "gecikti"
                                ? "gecikti"
                                : "bekliyor"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.bildirimDurumu === "gonderildi"
                            ? "success"
                            : item.bildirimDurumu === "planlandi"
                              ? "info"
                              : item.bildirimDurumu === "basarisiz"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {item.bildirimDurumu}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden">
          <MobileList empty={filtered.length === 0}>
            {filtered.map((item) => (
              <MobileCard key={item.id}>
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900">{item.musteriAdi}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.donem} · {tahakkukKalemLabel(item)}
                  </p>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant={item.tahakkukTuru === "vergi" ? "warning" : "neutral"}>
                    {tahakkukTuruLabel(item.tahakkukTuru)}
                  </Badge>
                  {item.resmiTahakkukFisNo && <Badge variant="info">{item.resmiTahakkukFisNo}</Badge>}
                  {item.otomatikTuretilmis && <Badge variant="info">Beyannameden</Badge>}
                </div>
                <MobileField label="Tutar">{formatPara(item.tutar)}</MobileField>
                <MobileField label="Odenen">{formatPara(item.odenenTutar ?? 0)}</MobileField>
                <MobileField label="Vade">{formatTarih(item.vadeTarihi)}</MobileField>
                <div className="flex flex-wrap gap-2">
                  <TahsilatBadge
                    durum={
                      item.durum === "odendi"
                        ? "odendi"
                        : item.durum === "kismi"
                          ? "kismi"
                          : item.durum === "gecikti"
                            ? "gecikti"
                            : "bekliyor"
                    }
                  />
                  <Badge variant="info">{item.bildirimDurumu}</Badge>
                </div>
              </MobileCard>
            ))}
          </MobileList>
        </div>
      </Card>

      <TahakkukModal
        open={showTahakkukModal}
        onClose={() => setShowTahakkukModal(false)}
        onSaved={(item) => setLocalTahakkuklar((prev) => [item, ...prev])}
      />
      <BankaEkstresiModal
        open={showBankaModal}
        onClose={() => setShowBankaModal(false)}
        onSuccess={handleBankaSuccess}
      />
    </div>
  );
}
