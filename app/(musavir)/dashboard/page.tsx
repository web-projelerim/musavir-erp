"use client";

import {
  Users,
  AlertTriangle,
  CheckSquare,
  Bell,
  FileText,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { MetricCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { MOCK_MUSTERILER, MOCK_GOREVLER, MOCK_TEBLIGATLAR, MOCK_BEYANNAMELER } from "@/lib/data/mock";
import { formatTarih } from "@/lib/utils/format";
import Link from "next/link";

export default function DashboardPage() {
  const kritikMusteriler = MOCK_MUSTERILER.filter(
    (m) => m.riskSeviyesi === "kritik" || m.riskSeviyesi === "yuksek"
  );
  const bekleyenGorevler = MOCK_GOREVLER.filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal");
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
      subtitle: "Acil müdahale gerekebilir",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      variant: kritikMusteriler.length > 0 ? "danger" as const : "default" as const,
    },
    {
      title: "Bekleyen Görevler",
      value: bekleyenGorevler.length,
      subtitle: `${bekleyenGorevler.filter((g) => g.oncelik === "kritik").length} kritik öncelikli`,
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
      subtitle: "Bu hafta son tarihe yakın",
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
        subtitle={`Bugün: ${new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {metrics.map((m) => (
          <MetricCard
            key={m.title}
            title={m.title}
            value={m.value}
            subtitle={m.subtitle}
            icon={m.icon}
            variant={m.variant}
          />
        ))}
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
                    <div>
                      <p className="font-medium text-slate-800 text-xs">{m.firmaAdi}</p>
                      <p className="text-slate-400 text-xs font-mono mt-0.5">{m.vknTckn}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RiskMetre skor={m.riskSkoru} seviye={m.riskSeviyesi} showLabel />
                    </div>
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
              <Link href="/gorevler" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                Tümü <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {bekleyenGorevler.slice(0, 4).map((g) => (
                <div key={g.id} className="px-5 py-3 hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{g.baslik}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{g.musteriAdi}</p>
                    </div>
                    <Badge
                      variant={
                        g.oncelik === "kritik"
                          ? "danger"
                          : g.oncelik === "yuksek"
                          ? "warning"
                          : "neutral"
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
                <div key={t.id} className="px-5 py-3 hover:bg-slate-50 cursor-pointer">
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
    </div>
  );
}
