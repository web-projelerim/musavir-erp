"use client";

import { useState } from "react";
import { FileText, Send, Plus, Download, RefreshCw, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, RaporDurumBadge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/Card";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { useRaporlar } from "@/lib/hooks/useRaporlar";
import { raporOlustur, raporDurumGuncelle } from "@/lib/services/rapor.service";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import { useToast } from "@/lib/context/ToastContext";
import { formatTarih } from "@/lib/utils/format";
import type { Rapor } from "@/lib/types";

const RAPOR_TIP_LABELS: Record<string, string> = {
  gelir_gider: "Gelir - Gider Özeti",
  vergi_beyan: "Vergi & Beyan Durumu",
  operasyon: "Operasyon Özeti",
  risk: "Risk Raporu",
};

export default function RaporlarPage() {
  const toast = useToast();
  const { data: raporlar, setData: setRaporlar, loading } = useRaporlar();
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [selected, setSelected] = useState<string[]>([]);
  const [showWaModal, setShowWaModal] = useState(false);

  const filtered = raporlar.filter(
    (r) => filterDurum === "tumu" || r.durum === filterDurum
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const handleRaporUret = async (tip: string) => {
    const yeniRapor: Rapor = {
      id: `r-${Date.now()}`,
      musteriId: "m1",
      musteriAdi: "Akdeniz Tekstil A.Ş.",
      tip: tip as Rapor["tip"],
      donem: new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      durum: "uretiliyor",
      olusturmaTarihi: new Date().toISOString(),
    };

    setRaporlar((prev) => [yeniRapor, ...prev]);
    toast.info("Rapor üretiliyor...", `${RAPOR_TIP_LABELS[tip]} hazırlanıyor`);

    if (FB_CONFIGURED) {
      try {
        const { id: _drop, ...raporData } = yeniRapor;
        const id = await raporOlustur(raporData);
        setTimeout(async () => {
          await raporDurumGuncelle(id, "hazir");
        }, 2500);
      } catch {
        toast.error("Rapor oluşturulamadı");
        return;
      }
    } else {
      setTimeout(() => {
        setRaporlar((prev) =>
          prev.map((r) => r.id === yeniRapor.id ? { ...r, durum: "hazir" } : r)
        );
        toast.success("Rapor hazır!", "Gönderim için hazır durumda");
      }, 2500);
    }
  };

  const handleTopluGonder = () => {
    if (selected.length === 0) {
      toast.warning("Rapor seçilmedi", "Göndermek için en az bir rapor seçin");
      return;
    }
    setShowWaModal(true);
  };

  const handleIndir = (rapor: Rapor) =>
    toast.success("İndirme başladı", `${rapor.musteriAdi} - ${rapor.donem}`);

  const handleEmailGonder = async (rapor: Rapor) => {
    try {
      if (FB_CONFIGURED) await raporDurumGuncelle(rapor.id, "gonderildi");
      setRaporlar((prev) =>
        prev.map((r) => r.id === rapor.id
          ? { ...r, durum: "gonderildi", kanal: "email", gonderimTarihi: new Date().toISOString() }
          : r)
      );
      toast.success("Gönderim planlandı", `${rapor.musteriAdi} için e-posta gönderimi`);
    } catch {
      toast.error("Gönderim başarısız");
    }
  };

  const metrics = [
    { title: "Toplam Rapor", value: raporlar.length, subtitle: "Bu ay" },
    { title: "Gönderildi", value: raporlar.filter((r) => r.durum === "gonderildi").length,
      subtitle: "Başarılı gönderim", variant: "success" as const },
    { title: "Hazır / Bekliyor", value: raporlar.filter((r) => r.durum === "hazir").length,
      subtitle: "Gönderim bekliyor", variant: "warning" as const },
    { title: "Üretiliyor", value: raporlar.filter((r) => r.durum === "uretiliyor").length, subtitle: "İşlemde" },
  ];

  const selectStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb", fontSize: 12,
    color: "#374151", borderRadius: 6, padding: "5px 10px", outline: "none",
  };

  return (
    <div>
      <PageHeader
        title="Rapor Merkezi"
        subtitle="Rapor üretimi ve gönderim yönetimi"
        action={
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <>
                <Button variant="outline" size="sm"
                  icon={<MessageCircle style={{ width: 13, height: 13 }} />}
                  onClick={() => setShowWaModal(true)}>
                  WhatsApp ({selected.length})
                </Button>
                <Button variant="outline" size="sm"
                  icon={<Send style={{ width: 13, height: 13 }} />}
                  onClick={handleTopluGonder}>
                  Toplu Gönder
                </Button>
              </>
            )}
            <Button size="sm" icon={<Plus style={{ width: 13, height: 13 }} />}
              onClick={() => handleRaporUret("gelir_gider")}>
              Rapor Oluştur
            </Button>
          </div>
        }
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {metrics.map((m) => <MetricCard key={m.title} {...m} />)}
      </div>

      {/* Hızlı Rapor Üret */}
      <div className="bg-white rounded-md mb-5"
        style={{ border: "1px solid #e5e7eb", padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
          Hızlı Rapor Üret
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(RAPOR_TIP_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => handleRaporUret(key)}
              className="group flex flex-col items-start rounded-md"
              style={{ padding: 12, border: "1px solid #e5e7eb", background: "#fff",
                cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                textAlign: "left" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#bfdbfe";
                (e.currentTarget as HTMLElement).style.background = "#eff6ff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
                (e.currentTarget as HTMLElement).style.background = "#fff";
              }}>
              <div className="flex items-center justify-center rounded"
                style={{ width: 28, height: 28, background: "#dbeafe", marginBottom: 8 }}>
                <FileText style={{ width: 14, height: 14, color: "#2563eb" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#374151", lineHeight: 1.4 }}>
                {label}
              </span>
              <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Tıkla & üret</span>
            </button>
          ))}
        </div>
      </div>

      {/* Raporlar listesi */}
      <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Üretilen Raporlar
            {selected.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, background: "#dbeafe",
                color: "#1d4ed8", padding: "1px 6px", borderRadius: 10 }}>
                {selected.length} seçili
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button onClick={() => setSelected([])}
                style={{ fontSize: 11, color: "#6b7280", background: "none",
                  border: "none", cursor: "pointer" }}>
                Seçimi temizle
              </button>
            )}
            <select value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)} style={selectStyle}>
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
                <input type="checkbox"
                  onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => r.id) : [])}
                  checked={selected.length === filtered.length && filtered.length > 0} />
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
            {loading ? (
              <SkeletonTable rows={5} cols={9} />
            ) : filtered.length === 0 ? (
              <TableEmpty colSpan={9} />
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} selected={selected.includes(r.id)}>
                  <TableCell>
                    <input type="checkbox" checked={selected.includes(r.id)}
                      onChange={() => toggleSelect(r.id)} />
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>
                      {r.musteriAdi}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{RAPOR_TIP_LABELS[r.tip]}</span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{r.donem}</span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{formatTarih(r.olusturmaTarihi)}</span>
                  </TableCell>
                  <TableCell>
                    {r.gonderimTarihi ? (
                      <span style={{ fontSize: 11, color: "#16a34a" }}>{formatTarih(r.gonderimTarihi)}</span>
                    ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                  </TableCell>
                  <TableCell>
                    {r.kanal ? (
                      <Badge variant={r.kanal === "whatsapp" ? "success" : "info"}>{r.kanal}</Badge>
                    ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                  </TableCell>
                  <TableCell><RaporDurumBadge durum={r.durum} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.durum === "hazir" && (
                        <button onClick={() => { setSelected([r.id]); setShowWaModal(true); }}
                          style={{ padding: 4, color: "#16a34a", background: "none",
                            border: "none", cursor: "pointer", borderRadius: 4 }}
                          title="WhatsApp ile gönder">
                          <MessageCircle style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                      {r.durum === "hazir" && (
                        <button onClick={() => handleEmailGonder(r)}
                          style={{ padding: 4, color: "#2563eb", background: "none",
                            border: "none", cursor: "pointer", borderRadius: 4 }}
                          title="E-posta ile gönder">
                          <Send style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                      {r.durum === "uretiliyor" && (
                        <span style={{ padding: 4, color: "#9ca3af" }}>
                          <RefreshCw style={{ width: 13, height: 13 }} className="animate-spin" />
                        </span>
                      )}
                      <button onClick={() => handleIndir(r)}
                        style={{ padding: 4, color: "#6b7280", background: "none",
                          border: "none", cursor: "pointer", borderRadius: 4 }}
                        title="İndir">
                        <Download style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WhatsAppGonderimModal
        open={showWaModal}
        onClose={() => { setShowWaModal(false); setSelected([]); }}
      />
    </div>
  );
}
