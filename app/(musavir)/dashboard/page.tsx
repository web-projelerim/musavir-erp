"use client";

import { useMemo, useState } from "react";
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
  X,
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
import { formatTarih } from "@/lib/utils/format";
import Link from "next/link";

const RISK_DAGILIM = [
  { name: "Düşük", value: 2, color: "#10b981" },
  { name: "Orta", value: 2, color: "#f59e0b" },
  { name: "Yüksek", value: 2, color: "#f97316" },
  { name: "Kritik", value: 1, color: "#ef4444" },
];

const BEYAN_OZET = [
  { donem: "Nis", verildi: 8, bekliyor: 1, gecikti: 0 },
  { donem: "May", verildi: 9, bekliyor: 0, gecikti: 1 },
  { donem: "Haz", verildi: 7, bekliyor: 2, gecikti: 1 },
  { donem: "Tem", verildi: 2, bekliyor: 5, gecikti: 1 },
];

const TAHSILAT_OZET = [
  { ay: "Nis", toplam: 28500, odenen: 28500 },
  { ay: "May", toplam: 31200, odenen: 29800 },
  { ay: "Haz", toplam: 29400, odenen: 22000 },
  { ay: "Tem", toplam: 16000, odenen: 5300 },
];

const RISK_RENKLER = {
  dusuk: { name: "Düşük", color: "#10b981" },
  orta: { name: "Orta", color: "#f59e0b" },
  yuksek: { name: "Yüksek", color: "#f97316" },
  kritik: { name: "Kritik", color: "#ef4444" },
} as const;

const AY_ADLARI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

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
  const { musteriler, gorevler, tebligatlar, beyannameler, raporlar, tahsilatlar, kdv2, resmiGazeteOzetleri, gibSyncLogs } = useAppData();
  const bekleyenGorevler = gorevler.filter(
    (g) => g.durum !== "tamamlandi" && g.durum !== "iptal"
  );
  const yeniTebligatlar = tebligatlar.filter((t) => t.durum === "yeni");
  const yaklasanBeyanlar = beyannameler.filter((b) => b.durum === "bekliyor");
  const hazirRaporlar = raporlar.filter((r) => r.durum === "hazir");
  const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif");
  const riskListesi = hesaplaRiskListesi({ musteriler: aktifMusteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, kdv2 });
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

  const tahsilatOzet = Object.values(
    tahsilatlar.reduce<Record<string, { ay: string; sortKey: string; toplam: number; odenen: number }>>(
      (acc, tahsilat) => {
        const key = ayKey(tahsilat.vadeTarihi);
        acc[key] ??= { ay: ayLabel(key), sortKey: key, toplam: 0, odenen: 0 };
        acc[key].toplam += tahsilat.tutar;
        acc[key].odenen += tahsilat.durum === "odendi" ? tahsilat.tutar : tahsilat.odenenTutar ?? 0;
        return acc;
      },
      {}
    )
  ).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-4);

  const metrics = [
    {
      title: "Toplam Müşteri",
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
      subtitle: "Son tarih yakın",
      icon: <Calendar className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Hazır Raporlar",
      value: hazirRaporlar.length,
      subtitle: "Gönderim bekliyor",
      icon: <FileText className="w-5 h-5" />,
      variant: "default" as const,
    },
  ];

  const visibleGazete = useMemo(
    () => resmiGazeteOzetleri.filter((item) => !dismissedGazete.includes(item.id)).slice(0, 2),
    [dismissedGazete, resmiGazeteOzetleri]
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
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

      <StatsDrawer
        title="Dashboard İstatistikleri"
        subtitle="Portföy, görev, tebligat ve rapor özeti"
        metrics={metrics}
      />

      {visibleGazete.length > 0 && (
        <div className="mb-6 space-y-3">
          {visibleGazete.map((item) => (
            <div key={item.id} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Resmi Gazete AI Ozeti</p>
                    <Badge variant={item.aksiyonGerekiyor ? "warning" : "info"}>{item.maliMusavirEtkiPuani}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{item.baslik}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.aiOzet}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.maliMusavirEtkisi}</p>
                  <a href={item.kaynakLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-blue-700 hover:text-blue-800">
                    Resmi metni ac
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedGazete((prev) => [...prev, item.id])}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grafik satırı */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Beyanname özeti bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Beyanname Özeti</h3>
              <p className="text-xs text-slate-500 mt-0.5">Son 4 ay</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Verildi</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />Bekliyor</span>
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
              <Bar dataKey="bekliyor" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gecikti" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk dağılımı pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Risk Dağılımı</h3>
          <p className="text-xs text-slate-500 mb-3">Aktif müşteriler</p>
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
                  {riskDagilim.map((d, i) => (
                    <Cell key={i} fill={d.color} />
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

      {/* Tahsilat grafiği */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Tahsilat Durumu</h3>
            <p className="text-xs text-slate-500 mt-0.5">Son 4 ay tahsilat özeti (TL)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={tahsilatOzet} barSize={28} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="ay" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(value: number) => [`₺${value.toLocaleString("tr-TR")}`, ""]}
              cursor={{ fill: "#f8fafc" }}
            />
            <Bar dataKey="toplam" fill="#dbeafe" name="Toplam" radius={[3, 3, 0, 0]} />
            <Bar dataKey="odenen" fill="#3b82f6" name="Ödenen" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block" />Toplam</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Ödenen</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kritik müşteriler */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Kritik & Yüksek Riskli Müşteriler</h3>
              <p className="text-xs text-slate-500 mt-0.5">Öncelikli aksiyon gerektiren firmalar</p>
            </div>
            <Link href="/musteriler" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              Tümü <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <MobileList empty={kritikRiskler.length === 0}>
            {kritikRiskler.map((risk) => {
              const m = risk.musteri;
              return (
                <MobileCard key={m.id}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/musteriler/${m.id}`} className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{m.firmaAdi}</p>
                      <p className="mt-1 text-xs font-mono text-slate-400">{m.vknTckn}</p>
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
                return (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/musteriler/${m.id}`} className="group">
                      <p className="font-medium text-slate-800 text-xs group-hover:text-blue-600 transition-colors">{m.firmaAdi}</p>
                      <p className="text-slate-400 text-xs font-mono mt-0.5">{m.vknTckn}</p>
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
                      {g.oncelik}
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
              <h3 className="text-sm font-semibold text-slate-800">GIB Sync Durumu</h3>
              <Link href="/ayarlar" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Ayarlar <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {gibSyncLogs.length === 0 ? (
                <div className="px-5 py-4 text-xs text-slate-400">Henüz sync kaydi yok</div>
              ) : (
                gibSyncLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-700">{log.syncTipi}</p>
                      <Badge variant={log.durum === "basarili" ? "success" : log.durum === "basarisiz" ? "danger" : "warning"}>
                        {log.durum}
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
          <Link href="/tebligatlar" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
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
                  <Badge variant="info">{b.tur}</Badge>
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
              <TableHeadCell>Müşteri</TableHeadCell>
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
                  <Badge variant="info">{b.tur}</Badge>
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
