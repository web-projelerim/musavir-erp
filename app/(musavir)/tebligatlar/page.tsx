"use client";

import { useState } from "react";
import { Bell, FileText, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { Badge, TebligatBadge, BeyannameBadge } from "@/components/ui/Badge";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { MOCK_TEBLIGATLAR, MOCK_BEYANNAMELER } from "@/lib/data/mock";
import { formatTarih } from "@/lib/utils/format";

const TABS = ["Tebligatlar", "Beyannameler"];

export default function TebligatlarPage() {
  const [activeTab, setActiveTab] = useState("Tebligatlar");
  const [filterDurum, setFilterDurum] = useState("tumu");

  const filteredTebligatlar = MOCK_TEBLIGATLAR.filter(
    (t) => filterDurum === "tumu" || t.durum === filterDurum
  );
  const filteredBeyanlar = MOCK_BEYANNAMELER.filter(
    (b) => filterDurum === "tumu" || b.durum === filterDurum
  );

  return (
    <div>
      <PageHeader
        title="Tebligat & Beyanname Takibi"
        subtitle="GİB kaynaklı resmi bildirimler ve beyanname durumları"
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Toplam Tebligat"
          value={MOCK_TEBLIGATLAR.length}
          subtitle="Bu dönem"
        />
        <MetricCard
          title="Yeni Tebligat"
          value={MOCK_TEBLIGATLAR.filter((t) => t.durum === "yeni").length}
          subtitle="İşlem bekliyor"
          variant="danger"
        />
        <MetricCard
          title="Bekleyen Beyan"
          value={MOCK_BEYANNAMELER.filter((b) => b.durum === "bekliyor").length}
          subtitle="Son tarih yaklaşıyor"
          variant="warning"
        />
        <MetricCard
          title="Geciken Beyan"
          value={MOCK_BEYANNAMELER.filter((b) => b.durum === "gecikti").length}
          subtitle="Acil işlem gerekiyor"
          variant="danger"
        />
      </div>

      {/* Tabs */}
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
                  {MOCK_TEBLIGATLAR.filter((t) => t.durum === "yeni").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filtre */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-5">
        <div className="flex items-center gap-3">
          <select
            value={filterDurum}
            onChange={(e) => setFilterDurum(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
          >
            <option value="tumu">Tüm Durumlar</option>
            {activeTab === "Tebligatlar" ? (
              <>
                <option value="yeni">Yeni</option>
                <option value="okundu">Okundu</option>
                <option value="islendi">İşlendi</option>
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
            {activeTab === "Tebligatlar" ? filteredTebligatlar.length : filteredBeyanlar.length} kayıt
          </span>
        </div>
      </div>

      {/* Tebligatlar tablosu */}
      {activeTab === "Tebligatlar" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tarih</TableHeadCell>
                <TableHeadCell>Müşteri</TableHeadCell>
                <TableHeadCell>VKN/TCKN</TableHeadCell>
                <TableHeadCell>Başlık</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>İşlem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredTebligatlar.length === 0 ? (
                <TableEmpty colSpan={7} />
              ) : (
                filteredTebligatlar.map((t) => (
                  <TableRow key={t.id}>
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
                        {t.notlar && (
                          <p className="text-xs text-amber-600 mt-0.5">{t.notlar}</p>
                        )}
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
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="PDF görüntüle">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {t.durum !== "islendi" && (
                          <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="İşlendi olarak işaretle">
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

      {/* Beyannameler tablosu */}
      {activeTab === "Beyannameler" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Müşteri</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Dönem</TableHeadCell>
                <TableHeadCell>Son Tarih</TableHeadCell>
                <TableHeadCell>Verilme Tarihi</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredBeyanlar.length === 0 ? (
                <TableEmpty colSpan={7} />
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
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{b.sorumlu}</span>
                    </TableCell>
                    <TableCell>
                      <BeyannameBadge durum={b.durum} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
