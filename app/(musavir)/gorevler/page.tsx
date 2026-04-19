"use client";

import { useState } from "react";
import { Plus, Search, Filter, Calendar, User } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, GorevDurumBadge } from "@/components/ui/Badge";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { MOCK_GOREVLER } from "@/lib/data/mock";
import { formatTarih } from "@/lib/utils/format";
import type { GorevDurum, GorevOncelik } from "@/lib/types";

const DURUM_KOLONLAR: { key: GorevDurum; label: string; color: string }[] = [
  { key: "beklemede", label: "Beklemede", color: "border-slate-300" },
  { key: "devam", label: "Devam Ediyor", color: "border-blue-400" },
  { key: "tamamlandi", label: "Tamamlandı", color: "border-emerald-400" },
];

const ONCELIK_RENK: Record<GorevOncelik, string> = {
  dusuk: "border-l-slate-300",
  normal: "border-l-blue-400",
  yuksek: "border-l-amber-400",
  kritik: "border-l-red-500",
};

export default function GorevlerPage() {
  const [view, setView] = useState<"kanban" | "tablo">("tablo");
  const [aramaText, setAramaText] = useState("");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [filterOncelik, setFilterOncelik] = useState("tumu");

  const filtered = MOCK_GOREVLER.filter((g) => {
    const matchesSearch =
      !aramaText ||
      g.baslik.toLowerCase().includes(aramaText.toLowerCase()) ||
      g.musteriAdi.toLowerCase().includes(aramaText.toLowerCase());
    const matchesDurum = filterDurum === "tumu" || g.durum === filterDurum;
    const matchesOncelik = filterOncelik === "tumu" || g.oncelik === filterOncelik;
    return matchesSearch && matchesDurum && matchesOncelik;
  });

  return (
    <div>
      <PageHeader
        title="Görev Yönetimi"
        subtitle={`${filtered.length} görev`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setView("tablo")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "tablo" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tablo
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Kanban
              </button>
            </div>
            <Button icon={<Plus className="w-4 h-4" />}>Yeni Görev</Button>
          </div>
        }
      />

      {/* Filtreler */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Görev veya müşteri ara..."
              value={aramaText}
              onChange={(e) => setAramaText(e.target.value)}
              className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
            />
          </div>
          <select
            value={filterDurum}
            onChange={(e) => setFilterDurum(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
          >
            <option value="tumu">Tüm Durumlar</option>
            <option value="beklemede">Beklemede</option>
            <option value="devam">Devam Ediyor</option>
            <option value="tamamlandi">Tamamlandı</option>
          </select>
          <select
            value={filterOncelik}
            onChange={(e) => setFilterOncelik(e.target.value)}
            className="bg-white border border-slate-200 text-sm text-slate-700 rounded-lg px-3 py-2 outline-none"
          >
            <option value="tumu">Tüm Öncelikler</option>
            <option value="kritik">Kritik</option>
            <option value="yuksek">Yüksek</option>
            <option value="normal">Normal</option>
            <option value="dusuk">Düşük</option>
          </select>
        </div>
      </div>

      {/* Kanban görünümü */}
      {view === "kanban" && (
        <div className="grid grid-cols-3 gap-5">
          {DURUM_KOLONLAR.map((kolon) => {
            const kolonGorevler = filtered.filter((g) => g.durum === kolon.key);
            return (
              <div key={kolon.key} className="flex flex-col gap-3">
                <div className={`flex items-center justify-between pb-2 border-b-2 ${kolon.color}`}>
                  <span className="text-sm font-semibold text-slate-700">{kolon.label}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {kolonGorevler.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {kolonGorevler.map((g) => (
                    <div
                      key={g.id}
                      className={`bg-white rounded-xl border border-slate-200 p-3.5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border-l-4 ${ONCELIK_RENK[g.oncelik]}`}
                    >
                      <p className="text-sm font-medium text-slate-800 leading-snug mb-2">{g.baslik}</p>
                      <p className="text-xs text-blue-600 font-medium mb-2.5">{g.musteriAdi}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {formatTarih(g.terminTarihi)}
                        </div>
                        <Badge
                          variant={
                            g.oncelik === "kritik" ? "danger" :
                            g.oncelik === "yuksek" ? "warning" : "neutral"
                          }
                        >
                          {g.oncelik}
                        </Badge>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-bold">
                            {g.atananKisi.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{g.atananKisi}</span>
                      </div>
                    </div>
                  ))}
                  {kolonGorevler.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Görev yok
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tablo görünümü */}
      {view === "tablo" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
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
              {filtered.length === 0 ? (
                <TableEmpty colSpan={7} />
              ) : (
                filtered.map((g) => (
                  <TableRow key={g.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{g.baslik}</p>
                        {g.aciklama && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{g.aciklama}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-blue-600">{g.musteriAdi}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{g.tip}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          g.oncelik === "kritik" ? "danger" :
                          g.oncelik === "yuksek" ? "warning" : "neutral"
                        }
                      >
                        {g.oncelik}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-xs font-bold">
                            {g.atananKisi.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600">{g.atananKisi}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-700">{formatTarih(g.terminTarihi)}</span>
                    </TableCell>
                    <TableCell>
                      <GorevDurumBadge durum={g.durum} />
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
