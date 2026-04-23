"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, MetricCard } from "@/components/ui/Card";
import { Badge, TahsilatBadge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeadCell, TableRow } from "@/components/ui/Table";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import { TahakkukModal } from "@/components/modals/TahakkukModal";
import { BankaEkstresiModal } from "@/components/modals/BankaEkstresiModal";
import { useAppData } from "@/lib/hooks/useAppData";
import { formatPara, formatTarih } from "@/lib/utils/format";
import { calculateTahakkukDurum } from "@/lib/domain/tahakkuk";
import type { Tahakkuk } from "@/lib/types";

export default function TahakkuklarPage() {
  const { tahakkuklar, gonderimler, bankaEkstreleri } = useAppData();
  const [showTahakkukModal, setShowTahakkukModal] = useState(false);
  const [showBankaModal, setShowBankaModal] = useState(false);
  const [localTahakkuklar, setLocalTahakkuklar] = useState<Tahakkuk[]>(tahakkuklar);

  useEffect(() => {
    setLocalTahakkuklar(tahakkuklar);
  }, [tahakkuklar]);

  const normalized = useMemo(
    () =>
      localTahakkuklar.map((tahakkuk) => ({
        ...tahakkuk,
        durum: calculateTahakkukDurum(tahakkuk),
      })),
    [localTahakkuklar]
  );

  const total = normalized.reduce((sum, item) => sum + item.tutar, 0);
  const totalPaid = normalized.reduce((sum, item) => sum + (item.odenenTutar ?? 0), 0);
  const pending = normalized.filter((item) => item.durum === "bekliyor" || item.durum === "kismi").length;
  const plannedWhatsApp = gonderimler.filter((item) => item.sablonId === "tahakkuk" && item.durum === "bekliyor").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tahakkuk ve Odemeler"
        subtitle="Tahakkuk olusturun, banka ekstrelerini eslestirin ve WhatsApp bildirim planini takip edin"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => setShowBankaModal(true)}>
              Banka Ekstresi
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowTahakkukModal(true)}>
              Yeni Tahakkuk
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard title="Toplam Tahakkuk" value={formatPara(total)} subtitle={`${normalized.length} kayit`} />
        <MetricCard title="Tahsil Edilen" value={formatPara(totalPaid)} subtitle="Banka + manuel odeme" variant="success" />
        <MetricCard title="Bekleyen" value={pending} subtitle="Odeme veya kismi odeme bekliyor" variant={pending > 0 ? "warning" : "default"} />
        <MetricCard title="Planli WhatsApp" value={plannedWhatsApp} subtitle="Gunluk scheduler kuyruunda" variant={plannedWhatsApp > 0 ? "warning" : "default"} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Aylik Tahakkuk Listesi</h3>
            <p className="mt-0.5 text-xs text-slate-500">Tahakkuk, odeme ve bildirim durumlari tek listede izlenir.</p>
          </div>
          <Badge variant={bankaEkstreleri.length > 0 ? "info" : "neutral"}>{bankaEkstreleri.length} banka importu</Badge>
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Musteri</TableHeadCell>
                <TableHeadCell>Donem</TableHeadCell>
                <TableHeadCell>Hizmet</TableHeadCell>
                <TableHeadCell>Tutar</TableHeadCell>
                <TableHeadCell>Odenen</TableHeadCell>
                <TableHeadCell>Vade</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Bildirim</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {normalized.length === 0 ? (
                <TableEmpty colSpan={8} message="Tahakkuk kaydi bulunamadi" />
              ) : (
                normalized.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><span className="text-xs font-medium text-slate-800">{item.musteriAdi}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{item.donem}</span></TableCell>
                    <TableCell><Badge variant="neutral">{item.hizmetTuru.replace("_", " ")}</Badge></TableCell>
                    <TableCell><span className="text-xs font-semibold text-slate-900">{formatPara(item.tutar)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{formatPara(item.odenenTutar ?? 0)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{formatTarih(item.vadeTarihi)}</span></TableCell>
                    <TableCell><TahsilatBadge durum={item.durum === "odendi" ? "odendi" : item.durum === "kismi" ? "kismi" : item.durum === "gecikti" ? "gecikti" : "bekliyor"} /></TableCell>
                    <TableCell>
                      <Badge variant={item.bildirimDurumu === "gonderildi" ? "success" : item.bildirimDurumu === "planlandi" ? "info" : item.bildirimDurumu === "basarisiz" ? "danger" : "neutral"}>
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
          <MobileList>
            {normalized.map((item) => (
              <MobileCard key={item.id}>
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900">{item.musteriAdi}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.donem} · {item.hizmetTuru.replace("_", " ")}</p>
                </div>
                <MobileField label="Tutar">{formatPara(item.tutar)}</MobileField>
                <MobileField label="Odenen">{formatPara(item.odenenTutar ?? 0)}</MobileField>
                <MobileField label="Vade">{formatTarih(item.vadeTarihi)}</MobileField>
                <div className="flex flex-wrap gap-2">
                  <TahsilatBadge durum={item.durum === "odendi" ? "odendi" : item.durum === "kismi" ? "kismi" : item.durum === "gecikti" ? "gecikti" : "bekliyor"} />
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
      <BankaEkstresiModal open={showBankaModal} onClose={() => setShowBankaModal(false)} />
    </div>
  );
}
