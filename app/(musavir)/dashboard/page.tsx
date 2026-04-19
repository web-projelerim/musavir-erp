"use client";

import { useState } from "react";
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
import { MetricCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
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
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { MOCK_MUSTERILER, MOCK_GOREVLER, MOCK_TEBLIGATLAR, MOCK_BEYANNAMELER } from "@/lib/data/mock";
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

export default function DashboardPage() {
  const [showGorevModal, setShowGorevModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);

  const kritikMusteriler = MOCK_MUSTERILER.filter(
    (m) => m.riskSeviyesi === "kritik" || m.riskSeviyesi === "yuksek"
  );
  const bekleyenGorevler = MOCK_GOREVLER.filter(
    (g) => g.durum !== "tamamlandi" && g.durum !== "iptal"
  );
  const yeniTebligatlar = MOCK_TEBLIGATLAR.filter((t) => t.durum === "yeni");
  const yaklasanBeyanlar = MOCK_BEYANNAMELER.filter((b) => b.durum === "bekliyor");

  const metrics = [
    {
      title: "Toplam Müşteri",
      value: MOCK_MUSTERILER.filter((m) => m.durum === "aktif").length,
      subtitle: `${MOCK_MUSTERILER.length} toplam kayıt`,
      icon: <Users className="w-5 h-5" />,
      variant: "default" as const,
    },
    {
      title: "Kritik & Yüksek Risk",
      value: kritikMusteriler.length,
      subtitle: "Acil müdahale",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      variant: kritikMusteriler.length > 0 ? "danger" as const : "default" as const,
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
      value: 2,
      subtitle: "Gönderim bekliyor",
      icon: <FileText className="w-5 h-5" />,
      variant: "default" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<MessageCircle className="w-3.5 h-3.5" />}
              onClick={() => setShowWaModal(true)}
            >
              WhatsApp Gönder
            </Button>
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowGorevModal(true)}
            >
              Yeni Görev
            </Button>
          </div>
        }
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

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
            <BarChart data={BEYAN_OZET} barSize={20} barGap={4}>
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
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={RISK_DAGILIM}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={3}
              >
                {RISK_DAGILIM.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {RISK_DAGILIM.map((d) => (
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
          <BarChart data={TAHSILAT_OZET} barSize={28} barGap={4}>
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
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Firma</TableHeadCell>
                <TableHeadCell>Risk</TableHeadCell>
                <TableHeadCell>Tahsilat</TableHeadCell>
                <TableHeadCell>Yaklaşan Beyan</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {kritikMusteriler.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/musteriler/${m.id}`} className="group">
                      <p className="font-medium text-slate-800 text-xs group-hover:text-blue-600 transition-colors">{m.firmaAdi}</p>
                      <p className="text-slate-400 text-xs font-mono mt-0.5">{m.vknTckn}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RiskMetre skor={m.riskSkoru} seviye={m.riskSeviyesi} showLabel />
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
              ))}
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
        <Table>
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
