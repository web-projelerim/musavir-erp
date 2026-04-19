"use client";

import { useState } from "react";
import { Search, Filter, Plus, ArrowUpDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { RiskBadge, TahsilatBadge, Badge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { MOCK_MUSTERILER } from "@/lib/data/mock";
import { formatTarih } from "@/lib/utils/format";
import Link from "next/link";
import type { Musteri, RiskSeviyesi, MusteriDurum } from "@/lib/types";

export default function MusterilerPage() {
  const [aramaText, setAramaText] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("tumu");
  const [filterDurum, setFilterDurum] = useState<string>("tumu");
  const [sortField, setSortField] = useState<keyof Musteri>("riskSkoru");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof Musteri) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredMusteriler = MOCK_MUSTERILER
    .filter((m) => {
      const searchLower = aramaText.toLowerCase();
      const matchesSearch =
        !aramaText ||
        m.firmaAdi.toLowerCase().includes(searchLower) ||
        m.vknTckn.includes(aramaText) ||
        m.yetkiliAd.toLowerCase().includes(searchLower);
      const matchesRisk = filterRisk === "tumu" || m.riskSeviyesi === filterRisk;
      const matchesDurum = filterDurum === "tumu" || m.durum === filterDurum;
      return matchesSearch && matchesRisk && matchesDurum;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA || "");
      const strB = String(valB || "");
      return sortDir === "asc" ? strA.localeCompare(strB, "tr") : strB.localeCompare(strA, "tr");
    });

  const SortHeader = ({ field, label }: { field: keyof Musteri; label: string }) => (
    <TableHeadCell>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-slate-700 transition-colors"
      >
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-blue-500" : "text-slate-300"}`} />
      </button>
    </TableHeadCell>
  );

  return (
    <div>
      <PageHeader
        title="Müşteri Listesi"
        subtitle={`${filteredMusteriler.length} müşteri gösteriliyor`}
        action={
          <Button icon={<Plus className="w-4 h-4" />}>
            Yeni Müşteri
          </Button>
        }
      />

      {/* Filtreler */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Firma adı, VKN veya yetkili ara..."
              value={aramaText}
              onChange={(e) => setAramaText(e.target.value)}
              className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
            />
          </div>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tumu">Tüm Riskler</option>
            <option value="dusuk">Düşük Risk</option>
            <option value="orta">Orta Risk</option>
            <option value="yuksek">Yüksek Risk</option>
            <option value="kritik">Kritik</option>
          </select>

          <select
            value={filterDurum}
            onChange={(e) => setFilterDurum(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tumu">Tüm Durumlar</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
            <option value="beklemede">Beklemede</option>
          </select>

          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{filteredMusteriler.length}</span> sonuç
            </div>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <Table>
          <TableHead>
            <tr>
              <SortHeader field="firmaAdi" label="Firma" />
              <TableHeadCell>VKN/TCKN</TableHeadCell>
              <SortHeader field="riskSkoru" label="Risk Skoru" />
              <TableHeadCell>Tahsilat</TableHeadCell>
              <TableHeadCell>Görev Durumu</TableHeadCell>
              <TableHeadCell>Yaklaşan Beyan</TableHeadCell>
              <TableHeadCell>Son Tebligat</TableHeadCell>
              <TableHeadCell>Sorumlu</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
              <TableHeadCell></TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredMusteriler.length === 0 ? (
              <TableEmpty colSpan={10} message="Arama kriterlerine uyan müşteri bulunamadı" />
            ) : (
              filteredMusteriler.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{m.firmaAdi}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{m.yetkiliAd}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                      {m.vknTckn}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <RiskMetre skor={m.riskSkoru} seviye={m.riskSeviyesi} showLabel size="sm" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <TahsilatBadge durum={m.tahsilatDurumu} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium ${
                        m.gorevDurumu === "Temiz" ? "text-emerald-600" : "text-slate-600"
                      }`}
                    >
                      {m.gorevDurumu}
                    </span>
                  </TableCell>
                  <TableCell>
                    {m.yaklasanBeyanname ? (
                      <span className="text-xs font-medium text-slate-700">
                        {formatTarih(m.yaklasanBeyanname)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.sonTebligat ? (
                      <span className="text-xs text-amber-600 font-medium">
                        {formatTarih(m.sonTebligat)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{m.sorumluPersonel}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.durum === "aktif" ? "success" : m.durum === "pasif" ? "neutral" : "warning"}
                    >
                      {m.durum}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/musteriler/${m.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Detay <ChevronRight className="w-3 h-3" />
                    </Link>
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
