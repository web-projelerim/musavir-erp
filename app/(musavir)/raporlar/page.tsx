"use client";

import { useState } from "react";
import { FileText, Send, Plus, Download, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, RaporDurumBadge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/Card";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { MOCK_RAPORLAR } from "@/lib/data/mock";
import { formatTarih, formatTarihSaat } from "@/lib/utils/format";

const RAPOR_TIP_LABELS: Record<string, string> = {
  gelir_gider: "Gelir - Gider Özeti",
  vergi_beyan: "Vergi & Beyan Durumu",
  operasyon: "Operasyon Özeti",
  risk: "Risk Raporu",
};

export default function RaporlarPage() {
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = MOCK_RAPORLAR.filter(
    (r) => filterDurum === "tumu" || r.durum === filterDurum
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const metrics = [
    { title: "Toplam Rapor", value: MOCK_RAPORLAR.length, subtitle: "Bu ay" },
    { title: "Gönderildi", value: MOCK_RAPORLAR.filter((r) => r.durum === "gonderildi").length, subtitle: "Başarılı gönderim", variant: "success" as const },
    { title: "Hazır / Bekliyor", value: MOCK_RAPORLAR.filter((r) => r.durum === "hazir").length, subtitle: "Gönderim bekliyor", variant: "warning" as const },
    { title: "Üretiliyor", value: MOCK_RAPORLAR.filter((r) => r.durum === "uretiliyor").length, subtitle: "İşlemde" },
  ];

  return (
    <div>
      <PageHeader
        title="Rapor Merkezi"
        subtitle="Rapor üretimi ve gönderim yönetimi"
        action={
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <Button variant="outline" size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                {selected.length} rapor gönder
              </Button>
            )}
            <Button icon={<Plus className="w-4 h-4" />}>Rapor Oluştur</Button>
          </div>
        }
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      {/* Şablonlar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Rapor Şablonları</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(RAPOR_TIP_LABELS).map(([key, label]) => (
            <button
              key={key}
              className="flex flex-col items-start p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-200">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 text-left leading-tight">{label}</span>
              <span className="text-xs text-slate-400 mt-1">Tüm müşteriler</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtreler + liste */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Üretilen Raporlar</h3>
          <div className="flex items-center gap-2">
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 outline-none"
            >
              <option value="tumu">Tüm Durumlar</option>
              <option value="hazir">Hazır</option>
              <option value="gonderildi">Gönderildi</option>
              <option value="uretiliyor">Üretiliyor</option>
              <option value="basarisiz">Başarısız</option>
            </select>
          </div>
        </div>
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(e.target.checked ? filtered.map((r) => r.id) : [])
                  }
                  checked={selected.length === filtered.length && filtered.length > 0}
                  className="rounded border-slate-300"
                />
              </TableHeadCell>
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>Rapor Türü</TableHeadCell>
              <TableHeadCell>Dönem</TableHeadCell>
              <TableHeadCell>Oluşturulma</TableHeadCell>
              <TableHeadCell>Gönderim</TableHeadCell>
              <TableHeadCell>Kanal</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
              <TableHeadCell>İşlem</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={9} />
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="rounded border-slate-300"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-800">{r.musteriAdi}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{RAPOR_TIP_LABELS[r.tip]}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{r.donem}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{formatTarih(r.olusturmaTarihi)}</span>
                  </TableCell>
                  <TableCell>
                    {r.gonderimTarihi ? (
                      <span className="text-xs text-emerald-600">{formatTarih(r.gonderimTarihi)}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.kanal ? (
                      <Badge variant={r.kanal === "whatsapp" ? "success" : "info"}>
                        {r.kanal}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RaporDurumBadge durum={r.durum} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.durum === "hazir" && (
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Gönder">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.durum === "uretiliyor" && (
                        <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors animate-spin">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="İndir">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
