"use client";

import { useMemo, useState } from "react";
import {
  Search, Plus, ArrowUpDown, ChevronRight,
  LayoutGrid, List, Phone, Mail, FileSpreadsheet,
  Calendar, CheckSquare, CreditCard, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TahsilatBadge, Badge } from "@/components/ui/Badge";
import {
  Table, TableHead, TableHeadCell, TableBody,
  TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { YeniMusteriModal } from "@/components/modals/YeniMusteriModal";
import { MusteriImportModal } from "@/components/modals/MusteriImportModal";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { hasPermission } from "@/lib/utils/permissions";
import { PageLoading } from "@/components/ui/PageLoading";
import { formatTarih } from "@/lib/utils/format";
import type { Beyanname, Gorev } from "@/lib/types";
import Link from "next/link";

// ─── Yaklaşan sorumluluk hesaplama ──────────────────────────────────────────

type SorumlulukTur = "beyanname" | "gorev" | "tahsilat";

interface YaklasanSorumluluk {
  tarih: string | null;
  tur: SorumlulukTur | null;
  etiket: string | null;
}

function hesaplaYaklasanSorumluluk(
  musteriId: string,
  beyannameler: Beyanname[],
  gorevler: Gorev[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tahsilatlar: any[]
): YaklasanSorumluluk {
  let minTs = Infinity;
  let result: YaklasanSorumluluk = { tarih: null, tur: null, etiket: null };

  for (const b of beyannameler) {
    if (b.musteriId !== musteriId || b.durum !== "bekliyor") continue;
    const ts = new Date(b.sonTarih).getTime();
    if (isNaN(ts) || ts >= minTs) continue;
    minTs = ts;
    result = { tarih: b.sonTarih, tur: "beyanname", etiket: `${b.tur} beyanname` };
  }

  for (const g of gorevler) {
    if (g.musteriId !== musteriId || g.durum === "tamamlandi" || g.durum === "iptal") continue;
    const ts = new Date(g.terminTarihi).getTime();
    if (isNaN(ts) || ts >= minTs) continue;
    minTs = ts;
    result = { tarih: g.terminTarihi, tur: "gorev", etiket: g.baslik };
  }

  for (const t of tahsilatlar) {
    if (t.musteriId !== musteriId || t.durum !== "bekliyor") continue;
    const ts = new Date(t.vadeTarihi).getTime();
    if (isNaN(ts) || ts >= minTs) continue;
    minTs = ts;
    result = {
      tarih: t.vadeTarihi,
      tur: "tahsilat",
      etiket: t.tutar != null ? `₺${Number(t.tutar).toLocaleString("tr-TR")} tahsilat` : "Tahsilat",
    };
  }

  return result;
}

// ─── Yardımcılar ────────────────────────────────────────────────────────────

const TUR_ICON: Record<SorumlulukTur, React.ElementType> = {
  beyanname: FileText,
  gorev:     CheckSquare,
  tahsilat:  CreditCard,
};

const TUR_RENK: Record<SorumlulukTur, string> = {
  beyanname: "bg-red-100 text-red-700",
  gorev:     "bg-blue-100 text-blue-700",
  tahsilat:  "bg-amber-100 text-amber-700",
};

const TUR_LABEL: Record<SorumlulukTur, string> = {
  beyanname: "Beyanname",
  gorev:     "Görev",
  tahsilat:  "Tahsilat",
};

type MusteriSortField = "firmaAdi" | "yaklasanSorumluluk";

// ─── Sayfa ──────────────────────────────────────────────────────────────────

export default function MusterilerPage() {
  const [aramaText, setAramaText]       = useState("");
  const [filterDurum, setFilterDurum]   = useState<string>("tumu");
  const [filterSorumlu, setFilterSorumlu] = useState<string>("tumu");
  const [filterTahsilat, setFilterTahsilat] = useState<string>("tumu");
  const [sortField, setSortField]       = useState<MusteriSortField>("yaklasanSorumluluk");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("asc");
  const [view, setView]                 = useState<"tablo" | "kart">("tablo");
  const [showYeniModal, setShowYeniModal]   = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { user } = useAuth();
  const { musteriler, beyannameler, gorevler, tahsilatlar, loading } = useAppData();
  const canWrite = hasPermission(user, "musteri_yazma");

  // Her müşteri için yaklaşan sorumluluk hesapla
  const sorumlulukMap = useMemo(() => {
    const map = new Map<string, YaklasanSorumluluk>();
    for (const m of musteriler) {
      map.set(m.id, hesaplaYaklasanSorumluluk(m.id, beyannameler, gorevler, tahsilatlar));
    }
    return map;
  }, [musteriler, beyannameler, gorevler, tahsilatlar]);

  const kayitlar = useMemo(
    () => musteriler.map((musteri) => ({
      musteri,
      sorumluluk: sorumlulukMap.get(musteri.id) ?? { tarih: null, tur: null, etiket: null },
    })),
    [musteriler, sorumlulukMap]
  );

  const handleSort = (field: MusteriSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredKayitlar = useMemo(() =>
    kayitlar
      .filter(({ musteri: m }) => {
        const low = aramaText.toLowerCase();
        const matchesSearch =
          !aramaText ||
          m.firmaAdi.toLowerCase().includes(low) ||
          m.vknTckn.includes(aramaText) ||
          m.yetkiliAd.toLowerCase().includes(low);
        const matchesDurum    = filterDurum    === "tumu" || m.durum            === filterDurum;
        const matchesSorumlu  = filterSorumlu  === "tumu" || m.sorumluPersonel  === filterSorumlu;
        const matchesTahsilat = filterTahsilat === "tumu" || m.tahsilatDurumu   === filterTahsilat;
        return matchesSearch && matchesDurum && matchesSorumlu && matchesTahsilat;
      })
      .sort((a, b) => {
        if (sortField === "yaklasanSorumluluk") {
          const tA = a.sorumluluk.tarih;
          const tB = b.sorumluluk.tarih;
          // Yaklaşan sorumluluğu olmayanlar her zaman sona
          if (!tA && !tB) return 0;
          if (!tA) return 1;
          if (!tB) return -1;
          const diff = new Date(tA).getTime() - new Date(tB).getTime();
          return sortDir === "asc" ? diff : -diff;
        }
        // firmaAdi
        const diff = a.musteri.firmaAdi.localeCompare(b.musteri.firmaAdi, "tr");
        return sortDir === "asc" ? diff : -diff;
      }),
    [kayitlar, aramaText, filterDurum, filterSorumlu, filterTahsilat, sortField, sortDir]
  );

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

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        subtitle={`${filteredKayitlar.length} müşteri gösteriliyor`}
        action={
          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <Button variant="outline" icon={<FileSpreadsheet className="w-4 h-4" />} onClick={() => setShowImportModal(true)}>
                Excel İçe Aktar
              </Button>
            )}
            {canWrite && (
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowYeniModal(true)}>
                Yeni Müşteri
              </Button>
            )}
          </div>
        }
      />

      {/* Filtreler */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 mb-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Firma adı, VKN veya yetkili ara..."
              value={aramaText}
              onChange={(e) => setAramaText(e.target.value)}
              className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              {sorumluOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
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

            <div className="ml-auto flex items-center gap-3">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{filteredKayitlar.length}</span> sonuç
              </div>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>

      {/* Kart görünümü */}
      {view === "kart" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredKayitlar.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400 text-sm">Kayıt bulunamadı</div>
          ) : (
            filteredKayitlar.map(({ musteri: m, sorumluluk }) => {
              const Icon = sorumluluk.tur ? TUR_ICON[sorumluluk.tur] : Calendar;
              return (
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

                  {/* Yaklaşan sorumluluk */}
                  <div className="mb-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                      Yaklaşan Sorumluluk
                    </p>
                    {sorumluluk.tarih ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{formatTarih(sorumluluk.tarih)}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{sorumluluk.etiket}</p>
                        </div>
                        {sorumluluk.tur && (
                          <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold flex-shrink-0 ml-2 ${TUR_RENK[sorumluluk.tur]}`}>
                            <Icon className="w-3 h-3" />
                            {TUR_LABEL[sorumluluk.tur]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-emerald-600">Sorumluluk yok</p>
                    )}
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
              );
            })
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
                <SortHeader field="yaklasanSorumluluk" label="Yaklaşan Sorumluluk" />
                <TableHeadCell>Tahsilat</TableHeadCell>
                <TableHeadCell>Görev Durumu</TableHeadCell>
                <TableHeadCell>Son Tebligat</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell></TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredKayitlar.length === 0 ? (
                <TableEmpty colSpan={9} message="Arama kriterlerine uyan müşteri bulunamadı" />
              ) : (
                filteredKayitlar.map(({ musteri: m, sorumluluk }) => {
                  const Icon = sorumluluk.tur ? TUR_ICON[sorumluluk.tur] : null;
                  return (
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
                        {sorumluluk.tarih ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              {Icon && sorumluluk.tur && (
                                <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center ${TUR_RENK[sorumluluk.tur]}`}>
                                  <Icon className="w-3 h-3" />
                                </span>
                              )}
                              <p className="text-xs font-semibold text-slate-800">{formatTarih(sorumluluk.tarih)}</p>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 pl-6 truncate max-w-[160px]">
                              {sorumluluk.etiket}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Sorumluluk yok</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TahsilatBadge durum={m.tahsilatDurumu} />
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${m.gorevDurumu === "Temiz" ? "text-emerald-600" : "text-slate-600"}`}>
                          {m.gorevDurumu}
                        </span>
                      </TableCell>
                      <TableCell>
                        {m.sonTebligat ? (
                          <span className="text-xs text-amber-600 font-medium">{formatTarih(m.sonTebligat)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600">{m.sorumluPersonel}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.durum === "aktif" ? "success" : m.durum === "pasif" ? "neutral" : "warning"}>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <YeniMusteriModal open={showYeniModal} onClose={() => setShowYeniModal(false)} />
      <MusteriImportModal open={showImportModal} onClose={() => setShowImportModal(false)} />
    </div>
  );
}
