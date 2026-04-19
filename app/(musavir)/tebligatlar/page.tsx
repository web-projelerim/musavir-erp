"use client";

import { useState } from "react";
import { Bell, FileText, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { Badge, TebligatBadge, BeyannameBadge } from "@/components/ui/Badge";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useTebligatlar } from "@/lib/hooks/useTebligatlar";
import { useBeyannameler } from "@/lib/hooks/useBeyannameler";
import { tebligatDurumGuncelle } from "@/lib/services/tebligat.service";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import { useToast } from "@/lib/context/ToastContext";
import { formatTarih } from "@/lib/utils/format";

const TABS = ["Tebligatlar", "Beyannameler"];

export default function TebligatlarPage() {
  const toast = useToast();
  const { data: tebligatlar, loading: tebLoading } = useTebligatlar();
  const { data: beyannameler, loading: beyanLoading } = useBeyannameler();
  const [activeTab, setActiveTab] = useState("Tebligatlar");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [isleniyorId, setIsleniyorId] = useState<string | null>(null);

  const filteredTebligatlar = tebligatlar.filter(
    (t) => filterDurum === "tumu" || t.durum === filterDurum
  );
  const filteredBeyanlar = beyannameler.filter(
    (b) => filterDurum === "tumu" || b.durum === filterDurum
  );

  const handleIslendi = async (id: string) => {
    setIsleniyorId(id);
    try {
      if (FB_CONFIGURED) await tebligatDurumGuncelle(id, "islendi");
      toast.success("Tebligat işlendi olarak işaretlendi");
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setIsleniyorId(null);
    }
  };

  const selectStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb", fontSize: 12,
    color: "#374151", borderRadius: 6, padding: "6px 10px", outline: "none",
  };

  const yeniTebligatSayi = tebligatlar.filter((t) => t.durum === "yeni").length;

  return (
    <div>
      <PageHeader
        title="Tebligat & Beyanname Takibi"
        subtitle="GİB kaynaklı resmi bildirimler ve beyanname durumları"
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard title="Toplam Tebligat" value={tebligatlar.length} subtitle="Bu dönem" />
        <MetricCard title="Yeni Tebligat" value={yeniTebligatSayi}
          subtitle="İşlem bekliyor" variant="danger" />
        <MetricCard title="Bekleyen Beyan"
          value={beyannameler.filter((b) => b.durum === "bekliyor").length}
          subtitle="Son tarih yaklaşıyor" variant="warning" />
        <MetricCard title="Geciken Beyan"
          value={beyannameler.filter((b) => b.durum === "gecikti").length}
          subtitle="Acil işlem gerekiyor" variant="danger" />
      </div>

      {/* Tabs */}
      <div className="mb-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <nav className="flex">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setFilterDurum("tumu"); }}
              style={{
                padding: "8px 16px", fontSize: 12, fontWeight: 500, border: "none",
                background: "transparent", cursor: "pointer",
                borderBottom: `2px solid ${activeTab === tab ? "#2563eb" : "transparent"}`,
                color: activeTab === tab ? "#2563eb" : "#6b7280",
                marginBottom: -1,
              }}>
              {tab}
              {tab === "Tebligatlar" && yeniTebligatSayi > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, background: "#fee2e2",
                  color: "#b91c1c", padding: "1px 5px", borderRadius: 10 }}>
                  {yeniTebligatSayi}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filtre */}
      <div className="bg-white rounded-md mb-4"
        style={{ border: "1px solid #e5e7eb", padding: "10px 14px" }}>
        <div className="flex items-center gap-3">
          <select value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)} style={selectStyle}>
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
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {activeTab === "Tebligatlar" ? filteredTebligatlar.length : filteredBeyanlar.length} kayıt
          </span>
        </div>
      </div>

      {/* Tebligatlar tablosu */}
      {activeTab === "Tebligatlar" && (
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
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
              {tebLoading ? (
                <SkeletonTable rows={6} cols={7} />
              ) : filteredTebligatlar.length === 0 ? (
                <TableEmpty colSpan={7} />
              ) : (
                filteredTebligatlar.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                        {formatTarih(t.tarih)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                        {t.musteriAdi}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280" }}>
                        {t.vknTckn}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{t.baslik}</p>
                        {t.notlar && (
                          <p style={{ fontSize: 11, color: "#d97706", marginTop: 2 }}>{t.notlar}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="neutral">{t.tur}</Badge></TableCell>
                    <TableCell><TebligatBadge durum={t.durum} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          style={{ padding: "5px", color: "#2563eb", borderRadius: 4,
                            background: "transparent", border: "none", cursor: "pointer" }}
                          title="PDF görüntüle">
                          <FileText style={{ width: 13, height: 13 }} />
                        </button>
                        {t.durum !== "islendi" && (
                          <button
                            onClick={() => handleIslendi(t.id)}
                            disabled={isleniyorId === t.id}
                            style={{ padding: "5px", color: "#16a34a", borderRadius: 4,
                              background: "transparent", border: "none",
                              cursor: isleniyorId === t.id ? "not-allowed" : "pointer",
                              opacity: isleniyorId === t.id ? 0.5 : 1 }}
                            title="İşlendi olarak işaretle">
                            <CheckCircle style={{ width: 13, height: 13 }} />
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
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
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
              {beyanLoading ? (
                <SkeletonTable rows={6} cols={7} />
              ) : filteredBeyanlar.length === 0 ? (
                <TableEmpty colSpan={7} />
              ) : (
                filteredBeyanlar.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                        {b.musteriAdi}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="info">{b.tur}</Badge></TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{b.donem}</span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, fontWeight: 500,
                        color: b.durum === "gecikti" ? "#dc2626" : "#374151" }}>
                        {formatTarih(b.sonTarih)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {b.verilmeTarihi ? (
                        <span style={{ fontSize: 11, color: "#16a34a" }}>
                          {formatTarih(b.verilmeTarihi)}
                        </span>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{b.sorumlu}</span>
                    </TableCell>
                    <TableCell><BeyannameBadge durum={b.durum} /></TableCell>
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
