"use client";

import { useState } from "react";
import { Search, Plus, ArrowUpDown, ChevronRight, LayoutGrid, List, Phone, Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { RiskBadge, TahsilatBadge, Badge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { YeniMusteriModal } from "@/components/modals/YeniMusteriModal";
import { useMusteriler } from "@/lib/hooks/useMusteriler";
import { formatTarih } from "@/lib/utils/format";
import Link from "next/link";
import type { Musteri } from "@/lib/types";

export default function MusterilerPage() {
  const { data: musteriler, loading } = useMusteriler();
  const [aramaText, setAramaText] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("tumu");
  const [filterDurum, setFilterDurum] = useState<string>("tumu");
  const [sortField, setSortField] = useState<keyof Musteri>("riskSkoru");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"tablo" | "kart">("tablo");
  const [showYeniModal, setShowYeniModal] = useState(false);

  const handleSort = (field: keyof Musteri) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const filteredMusteriler = musteriler
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
      if (typeof valA === "number" && typeof valB === "number")
        return sortDir === "asc" ? valA - valB : valB - valA;
      const strA = String(valA || "");
      const strB = String(valB || "");
      return sortDir === "asc" ? strA.localeCompare(strB, "tr") : strB.localeCompare(strA, "tr");
    });

  const SortHeader = ({ field, label }: { field: keyof Musteri; label: string }) => (
    <TableHeadCell>
      <button onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-slate-700 transition-colors">
        {label}
        <ArrowUpDown style={{ width: 11, height: 11, color: sortField === field ? "#2563eb" : "#d1d5db" }} />
      </button>
    </TableHeadCell>
  );

  const selectStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb", fontSize: 12, color: "#374151",
    borderRadius: 6, padding: "6px 10px", outline: "none",
  };

  return (
    <div>
      <PageHeader
        title="Müşteri Listesi"
        subtitle={`${filteredMusteriler.length} müşteri gösteriliyor`}
        action={
          <Button size="sm" icon={<Plus style={{ width: 13, height: 13 }} />}
            onClick={() => setShowYeniModal(true)}>
            Yeni Müşteri
          </Button>
        }
      />

      {/* Filtreler */}
      <div className="bg-white rounded-md mb-4"
        style={{ border: "1px solid #e5e7eb", padding: "10px 14px" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1"
            style={{ minWidth: 200, background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 6, padding: "6px 10px" }}>
            <Search style={{ width: 13, height: 13, color: "#9ca3af", flexShrink: 0 }} />
            <input type="text" placeholder="Firma adı, VKN veya yetkili ara..."
              value={aramaText} onChange={(e) => setAramaText(e.target.value)}
              style={{ background: "transparent", fontSize: 12, color: "#374151",
                outline: "none", flex: 1, border: "none" }} />
          </div>
          <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
            style={selectStyle}>
            <option value="tumu">Tüm Riskler</option>
            <option value="dusuk">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yuksek">Yüksek</option>
            <option value="kritik">Kritik</option>
          </select>
          <select value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)}
            style={selectStyle}>
            <option value="tumu">Tüm Durumlar</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
            <option value="beklemede">Beklemede</option>
          </select>
          <div className="flex rounded overflow-hidden ml-auto"
            style={{ border: "1px solid #e5e7eb" }}>
            <button onClick={() => setView("tablo")}
              style={{ padding: "5px 8px", background: view === "tablo" ? "#2563eb" : "#fff",
                color: view === "tablo" ? "#fff" : "#6b7280", cursor: "pointer", border: "none" }}>
              <List style={{ width: 13, height: 13 }} />
            </button>
            <button onClick={() => setView("kart")}
              style={{ padding: "5px 8px", background: view === "kart" ? "#2563eb" : "#fff",
                color: view === "kart" ? "#fff" : "#6b7280", cursor: "pointer", border: "none",
                borderLeft: "1px solid #e5e7eb" }}>
              <LayoutGrid style={{ width: 13, height: 13 }} />
            </button>
          </div>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            <span style={{ fontWeight: 600, color: "#374151" }}>{filteredMusteriler.length}</span> sonuç
          </span>
        </div>
      </div>

      {/* Kart görünümü */}
      {view === "kart" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredMusteriler.length === 0 ? (
            <div className="col-span-3 text-center py-16" style={{ fontSize: 12, color: "#9ca3af" }}>
              Kayıt bulunamadı
            </div>
          ) : (
            filteredMusteriler.map((m) => (
              <Link key={m.id} href={`/musteriler/${m.id}`}
                className="group block bg-white rounded-md"
                style={{ border: "1px solid #e5e7eb", padding: 16,
                  transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#bfdbfe";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgb(0 0 0 / .06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: "#111827" }} className="truncate">
                      {m.firmaAdi}
                    </h3>
                    <p style={{ fontSize: 11, fontFamily: "monospace", color: "#9ca3af", marginTop: 2 }}>
                      {m.vknTckn}
                    </p>
                  </div>
                  <Badge variant={m.durum === "aktif" ? "success" : "neutral"} className="ml-2 flex-shrink-0">
                    {m.durum}
                  </Badge>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>Risk</span>
                    <RiskBadge seviye={m.riskSeviyesi} />
                  </div>
                  <RiskMetre skor={m.riskSkoru} seviye={m.riskSeviyesi} showLabel size="md" />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>Tahsilat</p>
                    <TahsilatBadge durum={m.tahsilatDurumu} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>Görevler</p>
                    <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2,
                      color: m.gorevDurumu === "Temiz" ? "#16a34a" : "#374151" }}>
                      {m.gorevDurumu}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid #f3f4f6" }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                      <Phone style={{ width: 10, height: 10 }} /> {m.telefon}
                    </p>
                    <p style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}
                      className="truncate max-w-[160px]">
                      <Mail style={{ width: 10, height: 10 }} /> {m.email}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 3 }}>
                    Detay <ChevronRight style={{ width: 11, height: 11 }} />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Tablo görünümü */}
      {view === "tablo" && (
        <div className="bg-white rounded-md overflow-hidden"
          style={{ border: "1px solid #e5e7eb" }}>
          <Table>
            <TableHead>
              <tr>
                <SortHeader field="firmaAdi" label="Firma" />
                <TableHeadCell>VKN/TCKN</TableHeadCell>
                <SortHeader field="riskSkoru" label="Risk" />
                <TableHeadCell>Tahsilat</TableHeadCell>
                <TableHeadCell>Görev</TableHeadCell>
                <TableHeadCell>Yaklaşan Beyan</TableHeadCell>
                <TableHeadCell>Son Tebligat</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell></TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {loading ? (
                <SkeletonTable rows={8} cols={10} />
              ) : filteredMusteriler.length === 0 ? (
                <TableEmpty colSpan={10} message="Arama kriterlerine uyan müşteri bulunamadı" />
              ) : (
                filteredMusteriler.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{m.firmaAdi}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{m.yetkiliAd}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280",
                        background: "#f9fafb", padding: "2px 6px", borderRadius: 3 }}>
                        {m.vknTckn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" style={{ minWidth: 100 }}>
                        <RiskMetre skor={m.riskSkoru} seviye={m.riskSeviyesi} showLabel size="sm" />
                      </div>
                    </TableCell>
                    <TableCell><TahsilatBadge durum={m.tahsilatDurumu} /></TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, fontWeight: 500,
                        color: m.gorevDurumu === "Temiz" ? "#16a34a" : "#374151" }}>
                        {m.gorevDurumu}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.yaklasanBeyanname ? (
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                          {formatTarih(m.yaklasanBeyanname)}
                        </span>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell>
                      {m.sonTebligat ? (
                        <span style={{ fontSize: 11, color: "#d97706", fontWeight: 500 }}>
                          {formatTarih(m.sonTebligat)}
                        </span>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{m.sorumluPersonel}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.durum === "aktif" ? "success" : m.durum === "pasif" ? "neutral" : "warning"}>
                        {m.durum}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/musteriler/${m.id}`}
                        style={{ fontSize: 11, color: "#2563eb", fontWeight: 500,
                          display: "inline-flex", alignItems: "center", gap: 3 }}>
                        Detay <ChevronRight style={{ width: 11, height: 11 }} />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <YeniMusteriModal open={showYeniModal} onClose={() => setShowYeniModal(false)} />
    </div>
  );
}
