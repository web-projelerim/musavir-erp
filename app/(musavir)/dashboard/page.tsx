"use client";

import { useState } from "react";
import {
  Users, AlertTriangle, CheckSquare, Bell,
  FileText, Clock, Calendar, ArrowRight, Plus, MessageCircle,
  TrendingUp, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { MetricCard } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, RiskBadge, BeyannameBadge, TahsilatBadge } from "@/components/ui/Badge";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { MOCK_MUSTERILER, MOCK_GOREVLER, MOCK_TEBLIGATLAR, MOCK_BEYANNAMELER } from "@/lib/data/mock";
import { formatTarih } from "@/lib/utils/format";
import Link from "next/link";

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

const RISK_DAGILIM = [
  { name: "Düşük",  value: 3, color: "#22c55e" },
  { name: "Orta",   value: 2, color: "#f59e0b" },
  { name: "Yüksek", value: 2, color: "#f97316" },
  { name: "Kritik", value: 1, color: "#ef4444" },
];

function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{title}</p>
        {subtitle && <p style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

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
    { title: "Aktif Müşteri",     value: MOCK_MUSTERILER.filter((m) => m.durum === "aktif").length,
      subtitle: `${MOCK_MUSTERILER.length} toplam`,   icon: <Users style={{ width: 14, height: 14, color: "#6b7280" }} /> },
    { title: "Kritik & Yüksek",   value: kritikMusteriler.length,
      subtitle: "Acil müdahale",   icon: <AlertTriangle style={{ width: 14, height: 14, color: "#ef4444" }} />,
      variant: kritikMusteriler.length > 0 ? "danger" as const : "default" as const },
    { title: "Bekleyen Görev",    value: bekleyenGorevler.length,
      subtitle: `${bekleyenGorevler.filter((g) => g.oncelik === "kritik").length} kritik`,
      icon: <CheckSquare style={{ width: 14, height: 14, color: "#6b7280" }} /> },
    { title: "Yeni Tebligat",     value: yeniTebligatlar.length,
      subtitle: "İşlem bekliyor", icon: <Bell style={{ width: 14, height: 14, color: "#f59e0b" }} />,
      variant: yeniTebligatlar.length > 0 ? "warning" as const : "default" as const },
    { title: "Yaklaşan Beyan",    value: yaklasanBeyanlar.length,
      subtitle: "Son tarih yakın", icon: <Calendar style={{ width: 14, height: 14, color: "#6b7280" }} /> },
    { title: "Hazır Rapor",       value: 2,
      subtitle: "Gönderilebilir",  icon: <FileText style={{ width: 14, height: 14, color: "#6b7280" }} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Genel Bakış"
        subtitle={new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<MessageCircle style={{ width: 12, height: 12 }} />}
              onClick={() => setShowWaModal(true)}>
              WhatsApp
            </Button>
            <Button size="sm" icon={<Plus style={{ width: 12, height: 12 }} />}
              onClick={() => setShowGorevModal(true)}>
              Yeni Görev
            </Button>
          </div>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

        {/* Beyanname bar chart */}
        <div className="lg:col-span-2 bg-white rounded-md" style={{ border: "1px solid #e5e7eb" }}>
          <SectionHeader title="Beyanname Özeti" subtitle="Son 4 ay"
            action={
              <div className="flex items-center gap-3" style={{ fontSize: 10, color: "#6b7280" }}>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, background: "#22c55e", display: "inline-block", borderRadius: 2 }} />
                  Verildi
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, background: "#93c5fd", display: "inline-block", borderRadius: 2 }} />
                  Bekliyor
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, background: "#fca5a5", display: "inline-block", borderRadius: 2 }} />
                  Gecikti
                </span>
              </div>
            }
          />
          <div style={{ padding: "16px 16px 8px" }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={BEYAN_OZET} barSize={16} barGap={3} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="donem" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={16} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgb(0 0 0 / .08)" }} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="verildi" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="bekliyor" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                <Bar dataKey="gecikti" fill="#fca5a5" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk pie */}
        <div className="bg-white rounded-md" style={{ border: "1px solid #e5e7eb" }}>
          <SectionHeader title="Risk Dağılımı" subtitle="Aktif müşteriler" />
          <div style={{ padding: "12px 16px 8px" }}>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={RISK_DAGILIM} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={2} strokeWidth={0}>
                  {RISK_DAGILIM.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6, border: "1px solid #e5e7eb" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5" style={{ marginTop: 8 }}>
              {RISK_DAGILIM.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="rounded-full flex-shrink-0"
                    style={{ width: 7, height: 7, background: d.color }} />
                  <span style={{ fontSize: 10, color: "#6b7280" }}>
                    {d.name} <strong style={{ color: "#374151" }}>{d.value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tahsilat */}
      <div className="bg-white rounded-md mb-5" style={{ border: "1px solid #e5e7eb" }}>
        <SectionHeader title="Tahsilat Durumu" subtitle="Son 4 ay (₺)" />
        <div style={{ padding: "16px 16px 8px" }}>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={TAHSILAT_OZET} barSize={22} barGap={4} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="ay" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={44}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
                formatter={(v: number) => [`₺${v.toLocaleString("tr-TR")}`, ""]}
                cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="toplam" fill="#dbeafe" name="Toplam" radius={[2, 2, 0, 0]} />
              <Bar dataKey="odenen" fill="#3b82f6" name="Ödenen" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-1" style={{ fontSize: 10, color: "#6b7280" }}>
            <span className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, background: "#dbeafe", display: "inline-block", borderRadius: 2 }} />
              Toplam
            </span>
            <span className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, background: "#3b82f6", display: "inline-block", borderRadius: 2 }} />
              Ödenen
            </span>
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Kritik müşteriler */}
        <div className="lg:col-span-2 bg-white rounded-md" style={{ border: "1px solid #e5e7eb" }}>
          <SectionHeader title="Kritik & Yüksek Riskli Müşteriler"
            subtitle="Öncelikli aksiyon gerektiren firmalar"
            action={
              <Link href="/musteriler" className="flex items-center gap-1"
                style={{ fontSize: 11, color: "#3b82f6" }}>
                Tümü <ArrowRight style={{ width: 11, height: 11 }} />
              </Link>
            }
          />
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Firma</TableHeadCell>
                <TableHeadCell>Risk</TableHeadCell>
                <TableHeadCell>Tahsilat</TableHeadCell>
                <TableHeadCell>Son Beyan</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {kritikMusteriler.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/musteriler/${m.id}`}>
                      <p style={{ fontWeight: 500, color: "#111827", fontSize: 12 }}
                        className="hover:text-blue-600 transition-colors">{m.firmaAdi}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af", fontFamily: "monospace", marginTop: 1 }}>
                        {m.vknTckn}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell><RiskBadge seviye={m.riskSeviyesi} /></TableCell>
                  <TableCell><TahsilatBadge durum={m.tahsilatDurumu} /></TableCell>
                  <TableCell>
                    {m.yaklasanBeyanname
                      ? <span style={{ fontWeight: 500 }}>{formatTarih(m.yaklasanBeyanname)}</span>
                      : <span style={{ color: "#d1d5db" }}>—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Görevler */}
          <div className="bg-white rounded-md" style={{ border: "1px solid #e5e7eb" }}>
            <SectionHeader title="Bekleyen Görevler"
              action={
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowGorevModal(true)}
                    style={{ fontSize: 11, color: "#3b82f6", fontWeight: 500 }}>
                    + Yeni
                  </button>
                  <Link href="/gorevler" style={{ fontSize: 11, color: "#6b7280" }}
                    className="flex items-center gap-1 hover:text-gray-900">
                    Tümü <ArrowRight style={{ width: 10, height: 10 }} />
                  </Link>
                </div>
              }
            />
            <div>
              {bekleyenGorevler.slice(0, 4).map((g) => (
                <div key={g.id} className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: "1px solid #f9fafb" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}
                        className="truncate">{g.baslik}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}
                        className="truncate">{g.musteriAdi}</p>
                    </div>
                    <Badge variant={g.oncelik === "kritik" ? "danger" : g.oncelik === "yuksek" ? "warning" : "neutral"}>
                      {g.oncelik}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock style={{ width: 10, height: 10, color: "#d1d5db" }} />
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{formatTarih(g.terminTarihi)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tebligatlar */}
          <div className="bg-white rounded-md" style={{ border: "1px solid #e5e7eb" }}>
            <SectionHeader title="Yeni Tebligatlar"
              action={
                <Link href="/tebligatlar" style={{ fontSize: 11, color: "#3b82f6" }}
                  className="flex items-center gap-1">
                  Tümü <ArrowRight style={{ width: 10, height: 10 }} />
                </Link>
              }
            />
            <div>
              {yeniTebligatlar.map((t) => (
                <div key={t.id} className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: "1px solid #f9fafb" }}>
                  <div className="flex items-start gap-2">
                    <span className="rounded-full flex-shrink-0"
                      style={{ width: 6, height: 6, background: "#ef4444", marginTop: 4 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}
                        className="truncate">{t.baslik}</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{t.musteriAdi}</p>
                      <p style={{ fontSize: 10, color: "#d1d5db" }}>{formatTarih(t.tarih)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {yeniTebligatlar.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
                  Yeni tebligat yok
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Yaklaşan Beyanlar */}
      <div className="mt-4 bg-white rounded-md" style={{ border: "1px solid #e5e7eb" }}>
        <SectionHeader title="Yaklaşan Beyannameler" subtitle="Son tarihe göre sıralı"
          action={
            <Link href="/tebligatlar" style={{ fontSize: 11, color: "#3b82f6" }}
              className="flex items-center gap-1">
              Tümü <ArrowRight style={{ width: 11, height: 11 }} />
            </Link>
          }
        />
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>Tür</TableHeadCell>
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
                  <span style={{ fontWeight: 500 }}>{b.musteriAdi}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{b.tur}</Badge>
                </TableCell>
                <TableCell>{b.donem}</TableCell>
                <TableCell>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{formatTarih(b.sonTarih)}</span>
                </TableCell>
                <TableCell style={{ color: "#6b7280" }}>{b.sorumlu}</TableCell>
                <TableCell><BeyannameBadge durum={b.durum} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <YeniGorevModal open={showGorevModal} onClose={() => setShowGorevModal(false)} />
      <WhatsAppGonderimModal open={showWaModal} onClose={() => setShowWaModal(false)} />
    </div>
  );
}
