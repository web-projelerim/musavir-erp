"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Send,
  Plus,
  Download,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, RaporDurumBadge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/Card";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { useToast } from "@/lib/context/ToastContext";
import { hesaplaMusteriRisk } from "@/lib/domain/risk";
import { useAppData } from "@/lib/hooks/useAppData";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createGonderimKaydi,
  createRapor,
  markRaporGonderildi,
  updateRapor,
  updateRaporDurum,
} from "@/lib/firebase/repositories";
import { uploadRaporPdf } from "@/lib/firebase/storage";
import { buildReportPdfBlob } from "@/lib/reports/pdfReport";
import { openPrintableReport } from "@/lib/reports/printableReport";
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
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [selected, setSelected] = useState<string[]>([]);
  const [showWaModal, setShowWaModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const {
    raporlar: loadedRaporlar,
    musteriler,
    gorevler,
    beyannameler,
    tahsilatlar,
    tebligatlar,
    gonderimler,
    kdv2,
  } = useAppData();
  const [raporlar, setRaporlar] = useState<Rapor[]>(loadedRaporlar);

  useEffect(() => {
    setRaporlar(loadedRaporlar);
  }, [loadedRaporlar]);

  const filtered = raporlar.filter(
    (r) => filterDurum === "tumu" || r.durum === filterDurum
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getRaporPayload = (rapor: Rapor) => {
    const musteri = musteriler.find((m) => m.id === rapor.musteriId);
    const raporGorevler = gorevler.filter((g) => g.musteriId === rapor.musteriId);
    const raporBeyanlar = beyannameler.filter((b) => b.musteriId === rapor.musteriId);
    const raporTahsilatlar = tahsilatlar.filter((t) => t.musteriId === rapor.musteriId);
    const raporTebligatlar = tebligatlar.filter((t) => t.musteriId === rapor.musteriId);
    const risk = musteri
      ? hesaplaMusteriRisk({
          musteri,
          gorevler: raporGorevler,
          beyannameler: raporBeyanlar,
          tahsilatlar: raporTahsilatlar,
          tebligatlar: raporTebligatlar,
          kdv2,
        })
      : undefined;

    return {
      rapor,
      musteri,
      gorevler: raporGorevler,
      beyannameler: raporBeyanlar,
      tahsilatlar: raporTahsilatlar,
      tebligatlar: raporTebligatlar,
      risk: risk ? { skor: risk.skor, seviye: risk.seviye } : undefined,
    };
  };

  const finalizeRapor = async (rapor: Rapor) => {
    const pdfBlob = buildReportPdfBlob(getRaporPayload(rapor));

    if (isFirebaseConfigured) {
      const upload = await uploadRaporPdf(rapor.musteriId, rapor.id, pdfBlob);
      await updateRapor(rapor.id, {
        durum: "hazir",
        pdfUrl: upload.url,
        pdfStoragePath: upload.storagePath,
      });
      return;
    }

    const pdfUrl = URL.createObjectURL(pdfBlob);
    setRaporlar((prev) =>
      prev.map((r) => (r.id === rapor.id ? { ...r, durum: "hazir", pdfUrl } : r))
    );
  };

  const handleRaporUret = async (tip: string) => {
    const musteri = musteriler[0];

    if (!musteri) {
      toast.warning("Müşteri bulunamadı", "Rapor üretmek için en az bir müşteri kaydı gerekir");
      return;
    }

    const yeniRapor: Rapor = {
      id: `r-${Date.now()}`,
      musteriId: musteri.id,
      musteriAdi: musteri.firmaAdi,
      tip: tip as Rapor["tip"],
      donem: "Temmuz 2024",
      durum: "uretiliyor",
      olusturmaTarihi: new Date().toISOString(),
    };

    if (isFirebaseConfigured) {
      try {
        const created = await createRapor({
          musteriId: yeniRapor.musteriId,
          musteriAdi: yeniRapor.musteriAdi,
          tip: yeniRapor.tip,
          donem: yeniRapor.donem,
        });
        yeniRapor.id = created.id;
      } catch (error) {
        console.error(error);
        toast.error("Rapor kaydı oluşturulamadı");
        return;
      }
    } else {
      setRaporlar((prev) => [yeniRapor, ...prev]);
    }

    toast.info("Rapor üretiliyor...", `${RAPOR_TIP_LABELS[tip]} hazırlanıyor`);
    setTimeout(() => {
      finalizeRapor(yeniRapor)
        .then(() => {
          toast.success("Rapor hazır!", "PDF dosyası oluşturuldu ve gönderim için hazır");
        })
        .catch((error) => {
          console.error(error);
          toast.error("Rapor PDF'i oluşturulamadı");
          if (isFirebaseConfigured) {
            updateRaporDurum(yeniRapor.id, "basarisiz").catch(console.error);
          } else {
            setRaporlar((prev) =>
              prev.map((r) => (r.id === yeniRapor.id ? { ...r, durum: "basarisiz" } : r))
            );
          }
        });
    }, 2500);
  };

  const handleTopluGonder = () => {
    if (selected.length === 0) {
      toast.warning("Rapor seçilmedi", "Göndermek için en az bir rapor seçin");
      return;
    }
    setShowWaModal(true);
  };

  const handleIndir = (rapor: Rapor) => {
    if (rapor.pdfUrl) {
      window.open(rapor.pdfUrl, "_blank", "noopener,noreferrer");
      toast.success("PDF açıldı", `${rapor.musteriAdi} - ${rapor.donem}`);
      return;
    }

    const opened = openPrintableReport(getRaporPayload(rapor));

    if (opened) {
      toast.success("Rapor hazırlandı", "Yazdır penceresinden PDF olarak kaydedebilirsiniz");
      return;
    }

    toast.info("Rapor indirildi", "Popup engellendiği için HTML rapor dosyası indirildi");
  };

  const handleRaporlarGonderildi = async (ids: string[], kanal: NonNullable<Rapor["kanal"]>) => {
    if (isFirebaseConfigured) {
      try {
        await Promise.all(ids.map((id) => markRaporGonderildi(id, kanal)));
      } catch (error) {
        console.error(error);
        toast.error("Rapor gönderim durumu güncellenemedi");
      }
      return;
    }

    setRaporlar((prev) =>
      prev.map((rapor) =>
        ids.includes(rapor.id)
          ? {
              ...rapor,
              durum: "gonderildi",
              kanal,
              gonderimTarihi: new Date().toISOString(),
            }
          : rapor
      )
    );
  };

  const handleEmailGonder = async (rapor: Rapor) => {
    await handleRaporlarGonderildi([rapor.id], "email");

    if (isFirebaseConfigured) {
      try {
        await createGonderimKaydi({
          kanal: "email",
          musteriId: rapor.musteriId,
          musteriAdi: rapor.musteriAdi,
          sablonId: "s2",
          icerikRef: rapor.id,
          mesaj: `${rapor.donem} dönemi ${RAPOR_TIP_LABELS[rapor.tip]} raporu e-posta ile gönderildi.`,
          durum: "gonderildi",
          sentAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(error);
        toast.error("E-posta gönderim kaydı oluşturulamadı");
      }
    }

    toast.success("Gönderim planlandı", `${rapor.musteriAdi} için e-posta gönderimi`);
  };

  const metrics = [
    { title: "Toplam Rapor", value: raporlar.length, subtitle: "Bu ay" },
    { title: "Gönderildi", value: raporlar.filter((r) => r.durum === "gonderildi").length, subtitle: "Başarılı gönderim", variant: "success" as const },
    { title: "Hazır / Bekliyor", value: raporlar.filter((r) => r.durum === "hazir").length, subtitle: "Gönderim bekliyor", variant: "warning" as const },
    { title: "Üretiliyor", value: raporlar.filter((r) => r.durum === "uretiliyor").length, subtitle: "İşlemde" },
  ];

  return (
    <div>
      <PageHeader
        title="Rapor Merkezi"
        subtitle="Rapor üretimi ve gönderim yönetimi"
        action={
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<MessageCircle className="w-3.5 h-3.5" />}
                  onClick={() => setShowWaModal(true)}
                >
                  WhatsApp ({selected.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Send className="w-3.5 h-3.5" />}
                  onClick={handleTopluGonder}
                >
                  Toplu Gönder
                </Button>
              </>
            )}
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => handleRaporUret("operasyon")}>Rapor Oluştur</Button>
          </div>
        }
      />

      {/* Genel durum paneli */}
      {showStats ? (
        <div className="fixed bottom-6 left-0 top-20 z-40 w-[min(420px,calc(100vw-4rem))] lg:left-60">
          <section className="h-full overflow-y-auto rounded-r-xl border-y border-r border-slate-200 bg-slate-50/95 p-4 shadow-2xl backdrop-blur">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Genel Durum
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Rapor İstatistikleri</h2>
              <p className="mt-1 text-xs text-slate-500">
                Bu ayki üretim ve gönderim özeti
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {metrics.map((m) => (
                <MetricCard key={m.title} {...m} className="shadow-none" />
              ))}
            </div>
          </section>
          <button
            type="button"
            aria-label="Genel durum panelini kapat"
            aria-expanded={showStats}
            onClick={() => setShowStats(false)}
            className="absolute -right-11 top-1/2 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-r-xl border-y border-r border-slate-200 bg-white text-slate-600 shadow-lg transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Genel durum panelini aç"
          aria-expanded={showStats}
          onClick={() => setShowStats(true)}
          className="fixed left-0 top-1/2 z-40 flex h-16 w-11 -translate-y-1/2 items-center justify-center rounded-r-xl border-y border-r border-slate-200 bg-white text-slate-600 shadow-lg transition-colors hover:bg-blue-50 hover:text-blue-600 lg:left-60"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Şablonlar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Hızlı Rapor Üret</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(RAPOR_TIP_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleRaporUret(key)}
              className="flex flex-col items-start p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-200">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 text-left leading-tight">{label}</span>
              <span className="text-xs text-slate-400 mt-1">Tıkla & üret</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtreler + liste */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">
            Üretilen Raporlar
            {selected.length > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                {selected.length} seçili
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Seçimi temizle
              </button>
            )}
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
                <TableRow key={r.id} className={selected.includes(r.id) ? "bg-blue-50/50" : ""}>
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
                        <button
                          onClick={() => {
                            setSelected([r.id]);
                            setShowWaModal(true);
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="WhatsApp ile gönder"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.durum === "hazir" && (
                        <button
                          onClick={() => {
                            handleEmailGonder(r);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="E-posta ile gönder"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.durum === "uretiliyor" && (
                        <button className="p-1.5 text-slate-500 rounded-lg">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        </button>
                      )}
                      <button
                        onClick={() => handleIndir(r)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="İndir"
                      >
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

      {/* Gönderim geçmişi */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Gönderim Geçmişi</h3>
            <p className="text-xs text-slate-500 mt-0.5">WhatsApp ve e-posta denemeleri</p>
          </div>
          <span className="text-xs text-slate-500">{gonderimler.length} kayıt</span>
        </div>
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Tarih</TableHeadCell>
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>Kanal</TableHeadCell>
              <TableHeadCell>Şablon</TableHeadCell>
              <TableHeadCell>Deneme</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
              <TableHeadCell>Hata</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {gonderimler.length === 0 ? (
              <TableEmpty colSpan={7} message="Henüz gönderim kaydı yok" />
            ) : (
              [...gonderimler]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <span className="text-xs text-slate-600">{formatTarih(g.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-slate-800">{g.musteriAdi}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.kanal === "whatsapp" ? "success" : "info"}>{g.kanal}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{g.sablonId ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{g.denemeSayisi}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.durum === "gonderildi" ? "success" : g.durum === "basarisiz" ? "danger" : "neutral"}>
                        {g.durum}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">{g.hataMesaji ?? "—"}</span>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <WhatsAppGonderimModal
        open={showWaModal}
        raporIds={selected}
        onSuccess={(ids) => handleRaporlarGonderildi(ids, "whatsapp")}
        onClose={() => {
          setShowWaModal(false);
          setSelected([]);
        }}
      />
    </div>
  );
}
