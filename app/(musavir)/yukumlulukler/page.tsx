"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, MetricCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeadCell,
  TableRow,
} from "@/components/ui/Table";
import {
  beyanPeriyotLabel,
  yukumlulukTipLabel,
  yukumlulukVariant,
} from "@/lib/domain/yukumluluk";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { formatTarih } from "@/lib/utils/format";

const YUKUMLULUK_DURUM_LABEL: Record<string, string> = {
  planlandi: "Planlandı", bekliyor: "Bekliyor", hazirlaniyor: "Hazırlanıyor",
  tamamlandi: "Tamamlandı", gecikti: "Gecikti", pasif: "Pasif",
};

export default function YukumluluklerPage() {
  const { yukumlulukler, mukellefiyetProfilleri, loading } = useAppData();
  const [durumFilter, setDurumFilter] = useState("tumu");
  const [tipFilter, setTipFilter] = useState("tumu");

  const filtered = useMemo(
    () =>
      yukumlulukler.filter((item) => {
        const durumOk = durumFilter === "tumu" || item.durum === durumFilter;
        const tipOk = tipFilter === "tumu" || item.tip === tipFilter;
        return durumOk && tipOk;
      }),
    [durumFilter, tipFilter, yukumlulukler]
  );

  const aktif = yukumlulukler.filter((item) => item.durum !== "pasif").length;
  const geciken = yukumlulukler.filter((item) => item.durum === "gecikti").length;
  const hazirlanan = yukumlulukler.filter((item) => item.durum === "hazirlaniyor").length;

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Yükümlülükler"
        subtitle="Mükellefiyet profillerinden üretilen beyan ve takip yükümlülükleri"
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Yükümlülükler" }]}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard title="Toplam Profil" value={mukellefiyetProfilleri.length} subtitle="Mükellef bazlı profil" />
        <MetricCard title="Aktif Yükümlülük" value={aktif} subtitle="Bu dönem üretildi" />
        <MetricCard
          title="Hazırlanıyor"
          value={hazirlanan}
          subtitle="Son tarih yaklaştı"
          variant={hazirlanan > 0 ? "warning" : "default"}
        />
        <MetricCard
          title="Geciken"
          value={geciken}
          subtitle="Acil müdahale gerekir"
          variant={geciken > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={durumFilter}
            onChange={(event) => setDurumFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tüm durumlar</option>
            <option value="bekliyor">Bekliyor</option>
            <option value="hazirlaniyor">Hazırlanıyor</option>
            <option value="gecikti">Gecikti</option>
            <option value="tamamlandi">Tamamlandı</option>
            <option value="pasif">Pasif</option>
          </select>
          <select
            value={tipFilter}
            onChange={(event) => setTipFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="tumu">Tüm tipler</option>
            <option value="kdv">KDV</option>
            <option value="muhtasar">Muhtasar</option>
            <option value="gecici_vergi">Geçici Vergi</option>
            <option value="sgk">SGK</option>
          </select>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} kayıt</span>
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-800">Dönemsel Yükümlülük Listesi</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Bu liste mükellefiyet profilinden otomatik üretilir.
          </p>
        </div>

        <MobileList empty={filtered.length === 0}>
          {filtered.map((item) => {
            const profil = mukellefiyetProfilleri.find((row) => row.id === item.profilId);
            return (
              <MobileCard key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.musteriAdi}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.donem}</p>
                  </div>
                  <Badge variant={yukumlulukVariant(item.durum)}>{YUKUMLULUK_DURUM_LABEL[item.durum] ?? item.durum}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MobileField label="Tip">{yukumlulukTipLabel(item.tip)}</MobileField>
                  <MobileField label="Son Tarih">{formatTarih(item.sonTarih)}</MobileField>
                  <MobileField label="Sorumlu">{item.sorumlu}</MobileField>
                  <MobileField label="Profil">
                    {profil
                      ? `${beyanPeriyotLabel(profil.kdvPeriyot)} / ${beyanPeriyotLabel(profil.muhtasarPeriyot)}`
                      : "-"}
                  </MobileField>
                </div>
                <Link
                  href={`/musteriler/${item.musteriId}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Mükellef detayı
                </Link>
              </MobileCard>
            );
          })}
        </MobileList>

        <Table className="hidden md:block">
          <TableHead>
            <tr>
              <TableHeadCell>Mükellef</TableHeadCell>
              <TableHeadCell>Tip</TableHeadCell>
              <TableHeadCell>Dönem</TableHeadCell>
              <TableHeadCell>Son Tarih</TableHeadCell>
              <TableHeadCell>Sorumlu</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
              <TableHeadCell>Profil</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={7} message="Yükümlülük kaydı bulunamadı" />
            ) : (
              filtered.map((item) => {
                const profil = mukellefiyetProfilleri.find((row) => row.id === item.profilId);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/musteriler/${item.musteriId}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {item.musteriAdi}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{yukumlulukTipLabel(item.tip)}</Badge>
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-600">{item.donem}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-700">{formatTarih(item.sonTarih)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{item.sorumlu}</span></TableCell>
                    <TableCell>
                      <Badge variant={yukumlulukVariant(item.durum)}>{YUKUMLULUK_DURUM_LABEL[item.durum] ?? item.durum}</Badge>
                    </TableCell>
                    <TableCell>
                      {profil ? (
                        <div className="text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                            KDV: {beyanPeriyotLabel(profil.kdvPeriyot)}
                          </div>
                          <div className="mt-1">Muhtasar: {beyanPeriyotLabel(profil.muhtasarPeriyot)}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Profil yok</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
