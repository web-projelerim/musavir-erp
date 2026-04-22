"use client";

import { useState } from "react";
import { Search, Plus, ArrowUpDown, ChevronRight, LayoutGrid, List, Phone, Mail } from "lucide-react";
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
import { YeniMusteriModal } from "@/components/modals/YeniMusteriModal";
import { riskMapOlustur } from "@/lib/domain/risk";
import { useAppData } from "@/lib/hooks/useAppData";
import { formatTarih } from "@/lib/utils/format";
import Link from "next/link";

type MusteriSortField = "firmaAdi" | "risk";

export default function MusterilerPage() {
  const [aramaText, setAramaText] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("tumu");
  const [filterDurum, setFilterDurum] = useState<string>("tumu");
  const [filterSorumlu, setFilterSorumlu] = useState<string>("tumu");
  const [filterTahsilat, setFilterTahsilat] = useState<string>("tumu");
  const [sortField, setSortField] = useState<MusteriSortField>("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"tablo" | "kart">("tablo");
  const [showYeniModal, setShowYeniModal] = useState(false);
  const { musteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, kdv2 } = useAppData();
  const riskMap = riskMapOlustur({ musteriler, tebligatlar, beyannameler, gorevler, tahsilatlar, kdv2 });
  const riskKayitlari = musteriler.map((musteri) => ({
    musteri,
    risk: riskMap.get(musteri.id)!,
  }));

  const handleSort = (field: MusteriSortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredMusteriler = riskKayitlari
    .filter(({ musteri: m, risk }) => {
      const searchLower = aramaText.toLowerCase();
      const matchesSearch =
        !aramaText ||
        m.firmaAdi.toLowerCase().includes(searchLower) ||
        m.vknTckn.includes(aramaText) ||
        m.yetkiliAd.toLowerCase().includes(searchLower);
      const matchesRisk = filterRisk === "tumu" || risk.seviye === filterRisk;
      const matchesDurum = filterDurum === "tumu" || m.durum === filterDurum;
      const matchesSorumlu = filterSorumlu === "tumu" || m.sorumluPersonel === filterSorumlu;
      const matchesTahsilat = filterTahsilat === "tumu" || m.tahsilatDurumu === filterTahsilat;
      return matchesSearch && matchesRisk && matchesDurum && matchesSorumlu && matchesTahsilat;
    })
    .sort((a, b) => {
      const valA = sortField === "risk" ? a.risk.skor : a.musteri[sortField];
      const valB = sortField === "risk" ? b.risk.skor : b.musteri[sortField];
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA || "");
      const strB = String(valB || "");
      return sortDir === "asc" ? strA.localeCompare(strB, "tr") : strB.localeCompare(strA, "tr");
    });

  const SortHeader = ({ field, label }: { field: MusteriSortField; label: string }) => (
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

  const sorumluOptions = Array.from(new Set(musteriler.map((m) => m.sorumluPersonel))).filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Müşteri Listesi"
        subtitle={`${filteredMusteriler.length} müşteri gösteriliyor`}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowYeniModal(true)}>
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

          <select
            value={filterSorumlu}
            onChange={(e) => setFilterSorumlu(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tumu">Tüm Sorumlular</option>
            {sorumluOptions.map((sorumlu) => (
              <option key={sorumlu} value={sorumlu}>{sorumlu}</option>
            ))}
          </select>

          <select
            value={filterTahsilat}
            onChange={(e) => setFilterTahsilat(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tumu">Tüm Tahsilatlar</option>
            <option value="odendi">Ödendi</option>
            <option value="bekliyor">Bekliyor</option>
            <option value="gecikti">Gecikti</option>
            <option value="kismi">Kısmi</option>
          </select>

          {/* Görünüm geçişi */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto">
            <button
              onClick={() => setView("tablo")}
              className={`p-2 transition-colors ${view === "tablo" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("kart")}
              className={`p-2 transition-colors ${view === "kart" ? "bg-blue-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{filteredMusteriler.length}</span> sonuç
          </div>
        </div>
      </div>

      {/* Kart görünümü */}
      {view === "kart" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMusteriler.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400 text-sm">Kayıt bulunamadı</div>
          ) : (
            filteredMusteriler.map(({ musteri: m, risk }) => (
              <Link
                key={m.id}
                href={`/musteriler/${m.id}`}
                className="group bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover hover:border-blue-200 transition-all p-5 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                      {m.firmaAdi}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{m.vknTckn}</p>
                  </div>
                  <Badge variant={m.durum === "aktif" ? "success" : "neutral"} className="ml-2 flex-shrink-0">
                    {m.durum}
                  </Badge>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Risk Skoru</span>
                    <RiskBadge seviye={risk.seviye} />
                  </div>
                  <RiskMetre skor={risk.skor} seviye={risk.seviye} showLabel size="md" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-slate-400">Tahsilat</p>
                    <TahsilatBadge durum={m.tahsilatDurumu} />
                  </div>
                  <div>
                    <p className="text-slate-400">Görevler</p>
                    <p className={`font-medium mt-0.5 ${m.gorevDurumu === "Temiz" ? "text-emerald-600" : "text-slate-700"}`}>
                      {m.gorevDurumu}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {m.telefon}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-[160px]">
                      <Mail className="w-3 h-3" /> {m.email}
                    </p>
                  </div>
                  <span className="text-xs text-blue-600 group-hover:text-blue-700 font-medium flex items-center gap-0.5">
                    Detay <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Tablo görünümü */}
      {view === "tablo" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <SortHeader field="firmaAdi" label="Firma" />
                <TableHeadCell>VKN/TCKN</TableHeadCell>
                <SortHeader field="risk" label="Risk Skoru" />
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
                filteredMusteriler.map(({ musteri: m, risk }) => (
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
                        <RiskMetre skor={risk.skor} seviye={risk.seviye} showLabel size="sm" />
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
      )}

      <YeniMusteriModal
        open={showYeniModal}
        onClose={() => setShowYeniModal(false)}
      />
    </div>
  );
}
