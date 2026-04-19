"use client";

import { useState } from "react";
import { Plus, Search, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, GorevDurumBadge } from "@/components/ui/Badge";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { GorevDetayDrawer } from "@/components/modals/GorevDetayDrawer";
import { useGorevler } from "@/lib/hooks/useGorevler";
import { gorevDurumGuncelle } from "@/lib/services/gorev.service";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import { formatTarih } from "@/lib/utils/format";
import { useToast } from "@/lib/context/ToastContext";
import type { GorevDurum, GorevOncelik, Gorev } from "@/lib/types";

const DURUM_KOLONLAR: { key: GorevDurum; label: string; borderColor: string }[] = [
  { key: "beklemede", label: "Beklemede", borderColor: "#d1d5db" },
  { key: "devam", label: "Devam Ediyor", borderColor: "#60a5fa" },
  { key: "tamamlandi", label: "Tamamlandı", borderColor: "#34d399" },
];

const ONCELIK_BORDER: Record<GorevOncelik, string> = {
  dusuk: "#d1d5db", normal: "#60a5fa", yuksek: "#fbbf24", kritik: "#ef4444",
};

export default function GorevlerPage() {
  const toast = useToast();
  const { data: gorevler, loading } = useGorevler();
  const [view, setView] = useState<"kanban" | "tablo">("tablo");
  const [aramaText, setAramaText] = useState("");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [filterOncelik, setFilterOncelik] = useState("tumu");
  const [showYeniModal, setShowYeniModal] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Gorev | null>(null);
  const [localDurumlar, setLocalDurumlar] = useState<Record<string, GorevDurum>>({});

  const getDurum = (g: Gorev): GorevDurum => localDurumlar[g.id] ?? g.durum;

  const handleDurumGuncelle = async (id: string, durum: GorevDurum) => {
    setLocalDurumlar((prev) => ({ ...prev, [id]: durum }));
    if (FB_CONFIGURED) {
      try { await gorevDurumGuncelle(id, durum); } catch {
        toast.error("Durum güncellenemedi");
        setLocalDurumlar((prev) => { const n = { ...prev }; delete n[id]; return n; });
      }
    }
  };

  const filtered = gorevler.filter((g) => {
    const matchesSearch =
      !aramaText ||
      g.baslik.toLowerCase().includes(aramaText.toLowerCase()) ||
      g.musteriAdi.toLowerCase().includes(aramaText.toLowerCase());
    const matchesDurum = filterDurum === "tumu" || getDurum(g) === filterDurum;
    const matchesOncelik = filterOncelik === "tumu" || g.oncelik === filterOncelik;
    return matchesSearch && matchesDurum && matchesOncelik;
  });

  const bekleyenSayi = gorevler.filter((g) => getDurum(g) !== "tamamlandi" && g.durum !== "iptal").length;

  const selectStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb", fontSize: 12,
    color: "#374151", borderRadius: 6, padding: "6px 10px", outline: "none",
  };

  return (
    <>
      <div>
        <PageHeader
          title="Görev Yönetimi"
          subtitle={`${bekleyenSayi} bekleyen görev`}
          action={
            <div className="flex items-center gap-2">
              <div className="flex rounded overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
                {(["tablo", "kanban"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    style={{ padding: "5px 12px", fontSize: 11, fontWeight: 500, cursor: "pointer",
                      border: "none", borderRight: v === "tablo" ? "1px solid #e5e7eb" : "none",
                      background: view === v ? "#2563eb" : "#fff",
                      color: view === v ? "#fff" : "#6b7280" }}>
                    {v === "tablo" ? "Tablo" : "Kanban"}
                  </button>
                ))}
              </div>
              <Button size="sm" icon={<Plus style={{ width: 13, height: 13 }} />}
                onClick={() => setShowYeniModal(true)}>
                Yeni Görev
              </Button>
            </div>
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
              <input type="text" placeholder="Görev veya müşteri ara..."
                value={aramaText} onChange={(e) => setAramaText(e.target.value)}
                style={{ background: "transparent", fontSize: 12, color: "#374151",
                  outline: "none", flex: 1, border: "none" }} />
            </div>
            <select value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)} style={selectStyle}>
              <option value="tumu">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="devam">Devam Ediyor</option>
              <option value="tamamlandi">Tamamlandı</option>
            </select>
            <select value={filterOncelik} onChange={(e) => setFilterOncelik(e.target.value)} style={selectStyle}>
              <option value="tumu">Tüm Öncelikler</option>
              <option value="kritik">Kritik</option>
              <option value="yuksek">Yüksek</option>
              <option value="normal">Normal</option>
              <option value="dusuk">Düşük</option>
            </select>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
              {filtered.length} görev
            </span>
          </div>
        </div>

        {/* Kanban */}
        {view === "kanban" && (
          <div className="grid grid-cols-3 gap-4">
            {DURUM_KOLONLAR.map((kolon) => {
              const kolonGorevler = filtered.filter((g) => getDurum(g) === kolon.key);
              return (
                <div key={kolon.key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-2"
                    style={{ borderBottom: `2px solid ${kolon.borderColor}` }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{kolon.label}</span>
                    <span style={{ fontSize: 11, background: "#f3f4f6", color: "#6b7280",
                      padding: "1px 8px", borderRadius: 10, fontWeight: 500 }}>
                      {kolonGorevler.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {kolonGorevler.map((g) => (
                      <div key={g.id} onClick={() => setSeciliGorev(g)}
                        className="bg-white rounded-md cursor-pointer"
                        style={{ border: "1px solid #e5e7eb", borderLeft: `3px solid ${ONCELIK_BORDER[g.oncelik]}`,
                          padding: 12, transition: "box-shadow 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgb(0 0 0 / .07)")}
                        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#111827", lineHeight: 1.4, marginBottom: 4 }}>
                          {g.baslik}
                        </p>
                        <p style={{ fontSize: 11, color: "#2563eb", fontWeight: 500, marginBottom: 8 }}>
                          {g.musteriAdi}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1" style={{ fontSize: 11, color: "#9ca3af" }}>
                            <Calendar style={{ width: 11, height: 11 }} />
                            {formatTarih(g.terminTarihi)}
                          </div>
                          <Badge variant={g.oncelik === "kritik" ? "danger" : g.oncelik === "yuksek" ? "warning" : "neutral"}>
                            {g.oncelik}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 pt-2"
                          style={{ borderTop: "1px solid #f3f4f6" }}>
                          <div className="flex items-center justify-center rounded-full"
                            style={{ width: 18, height: 18, background: "#dbeafe", fontSize: 9,
                              fontWeight: 700, color: "#2563eb" }}>
                            {g.atananKisi.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{g.atananKisi}</span>
                        </div>
                      </div>
                    ))}
                    {kolonGorevler.length === 0 && (
                      <div onClick={() => setShowYeniModal(true)}
                        className="text-center cursor-pointer"
                        style={{ padding: "20px 0", fontSize: 11, color: "#9ca3af",
                          border: "1px dashed #e5e7eb", borderRadius: 6 }}>
                        + Görev ekle
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tablo */}
        {view === "tablo" && (
          <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
            <Table>
              <TableHead>
                <tr>
                  <TableHeadCell>Görev</TableHeadCell>
                  <TableHeadCell>Müşteri</TableHeadCell>
                  <TableHeadCell>Tür</TableHeadCell>
                  <TableHeadCell>Öncelik</TableHeadCell>
                  <TableHeadCell>Atanan</TableHeadCell>
                  <TableHeadCell>Termin</TableHeadCell>
                  <TableHeadCell>Durum</TableHeadCell>
                </tr>
              </TableHead>
              <TableBody>
                {loading ? (
                  <SkeletonTable rows={8} cols={7} />
                ) : filtered.length === 0 ? (
                  <TableEmpty colSpan={7} />
                ) : (
                  filtered.map((g) => (
                    <TableRow key={g.id} onClick={() => setSeciliGorev(g)} className="cursor-pointer">
                      <TableCell>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{g.baslik}</p>
                          {g.aciklama && (
                            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}
                              className="truncate max-w-xs">{g.aciklama}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#2563eb" }}>{g.musteriAdi}</span>
                      </TableCell>
                      <TableCell><Badge variant="neutral">{g.tip}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={g.oncelik === "kritik" ? "danger" : g.oncelik === "yuksek" ? "warning" : "neutral"}>
                          {g.oncelik}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center justify-center rounded-full flex-shrink-0"
                            style={{ width: 18, height: 18, background: "#dbeafe",
                              fontSize: 9, fontWeight: 700, color: "#2563eb" }}>
                            {g.atananKisi.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{g.atananKisi}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                          {formatTarih(g.terminTarihi)}
                        </span>
                      </TableCell>
                      <TableCell><GorevDurumBadge durum={getDurum(g)} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <YeniGorevModal
        open={showYeniModal}
        onClose={() => setShowYeniModal(false)}
        onSuccess={() => toast.success("Görev listesi güncellendi")}
      />
      <GorevDetayDrawer
        gorev={seciliGorev}
        onClose={() => setSeciliGorev(null)}
        onDurumGuncelle={handleDurumGuncelle}
      />
    </>
  );
}
