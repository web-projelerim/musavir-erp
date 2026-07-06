"use client";

import { useEffect, useState } from "react";
import {
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
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/lib/context/ToastContext";
import { hesaplaMusteriRisk } from "@/lib/domain/risk";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { canViewVknTckn } from "@/lib/utils/maskData";
import { hasPermission } from "@/lib/utils/permissions";
import { getOfisId } from "@/lib/domain/office";
import { PageLoading } from "@/components/ui/PageLoading";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import {
  createGonderimKaydi,
  createRapor,
  markRaporGonderildi,
  updateRapor,
  updateRaporDurum,
} from "@/lib/firebase/repositories";
import { uploadRaporPdf } from "@/lib/firebase/storage";
import { whatsappGonderimYurut, buildRaporWhatsAppMessage } from "@/lib/domain/whatsappGonderim";
import { buildReportPdfBlob } from "@/lib/reports/pdfReport";
import { openPrintableReport } from "@/lib/reports/printableReport";
import { formatTarih } from "@/lib/utils/format";
import { donemAraligiHesapla, donemIcindeMi } from "@/lib/utils/donem";
import type { Rapor } from "@/lib/types";

const AY_ADLARI_FULL = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const KANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp", email: "E-posta", panel: "Panel",
};

const GONDERIM_DURUM_LABEL: Record<string, string> = {
  bekliyor: "Bekliyor",
  gonderildi: "Gönderildi",
  basarisiz: "Başarısız",
};

function monthToDonem(value: string): string {
  const [year, month] = value.split("-");
  return `${AY_ADLARI_FULL[Number(month) - 1] ?? month} ${year}`;
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const RAPOR_TIP_LABELS: Record<string, string> = {
  gelir_gider: "Gelir - Gider Özeti",
  vergi_beyan: "Vergi & Beyan Durumu",
  operasyon: "Operasyon Özeti",
  risk: "Risk Raporu",
};

export default function RaporlarPage() {
  const { user } = useAuth();
  const canRapor = hasPermission(user, "rapor_yonetimi");
  const toast = useToast();
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [selected, setSelected] = useState<string[]>([]);
  const [showWaModal, setShowWaModal] = useState(false);
  const [showRaporModal, setShowRaporModal] = useState(false);
  const [raporModalTip, setRaporModalTip] = useState("operasyon");
  const [secilenMusteriId, setSecilenMusteriId] = useState("");
  const [donemTipi, setDonemTipi] = useState<"aylik" | "yillik">("aylik");
  const [secilenDonem, setSecilenDonem] = useState(currentMonthValue);
  const [secilenYil, setSecilenYil] = useState(String(new Date().getFullYear()));
  const {
    raporlar: loadedRaporlar,
    musteriler,
    gorevler,
    beyannameler,
    tahsilatlar,
    tebligatlar,
    gonderimler,
    tahakkuklar,
    kdv2,
    whatsappEntegrasyonAyarlari,
    loading,
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
    const { donemBaslangic, donemBitis } = rapor;
    // Rapor gövdesi (görev/beyanname/tahsilat/tebligat listeleri) seçilen döneme (aylık/yıllık) filtrelenir.
    // Dönem aralığı yoksa (eski rapor kayıtları) filtrelenmeden tüm zamanlar gösterilir.
    const raporGorevler = gorevler.filter((g) => g.musteriId === rapor.musteriId && donemIcindeMi(g.terminTarihi, donemBaslangic, donemBitis));
    const raporBeyanlar = beyannameler.filter((b) => b.musteriId === rapor.musteriId && donemIcindeMi(b.sonTarih, donemBaslangic, donemBitis));
    const raporTahsilatlar = tahsilatlar.filter((t) => t.musteriId === rapor.musteriId && donemIcindeMi(t.vadeTarihi, donemBaslangic, donemBitis));
    const raporTebligatlar = tebligatlar.filter((t) => t.musteriId === rapor.musteriId && donemIcindeMi(t.tarih, donemBaslangic, donemBitis));
    const raporTahakkuklar = tahakkuklar.filter((t) => t.musteriId === rapor.musteriId && donemIcindeMi(t.vadeTarihi, donemBaslangic, donemBitis));
    // Risk skoru her zaman güncel/tüm-zaman veriye göre hesaplanır — "bu dönemde risk neydi" değil "şu an ne kadar riskli" sorusuna cevap verir.
    const musteriGorevleriTumu = gorevler.filter((g) => g.musteriId === rapor.musteriId);
    const musteriBeyanlarTumu = beyannameler.filter((b) => b.musteriId === rapor.musteriId);
    const musteriTahsilatlarTumu = tahsilatlar.filter((t) => t.musteriId === rapor.musteriId);
    const musteriTebligatlarTumu = tebligatlar.filter((t) => t.musteriId === rapor.musteriId);
    const musteriTahakkuklarTumu = tahakkuklar.filter((t) => t.musteriId === rapor.musteriId);
    const risk = musteri
      ? hesaplaMusteriRisk({
          musteri,
          gorevler: musteriGorevleriTumu,
          beyannameler: musteriBeyanlarTumu,
          tahsilatlar: musteriTahsilatlarTumu,
          tebligatlar: musteriTebligatlarTumu,
          tahakkuklar: musteriTahakkuklarTumu,
          kdv2,
        })
      : undefined;

    return {
      maskVkn: !canViewVknTckn(user),
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
    const pdfBlob = await buildReportPdfBlob(getRaporPayload(rapor));

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

  const openRaporModal = (tip: string) => {
    setRaporModalTip(tip);
    if (!secilenMusteriId && musteriler.length > 0) {
      setSecilenMusteriId(musteriler[0].id);
    }
    setShowRaporModal(true);
  };

  const handleRaporUret = async (
    tip: string,
    musteriId: string,
    donem: string,
    donemAraligi?: { baslangic: string; bitis: string }
  ) => {
    const musteri = musteriler.find((m) => m.id === musteriId) ?? musteriler[0];

    if (!musteri) {
      toast.warning("Müşteri bulunamadı", "Rapor üretmek için en az bir müşteri kaydı gerekir");
      return;
    }

    setShowRaporModal(false);

    const yeniRapor: Rapor = {
      id: `r-${Date.now()}`,
      ofisId: getOfisId(user?.ofisId),
      musteriId: musteri.id,
      musteriAdi: musteri.firmaAdi,
      tip: tip as Rapor["tip"],
      donem,
      donemBaslangic: donemAraligi?.baslangic,
      donemBitis: donemAraligi?.bitis,
      durum: "uretiliyor",
      olusturmaTarihi: new Date().toISOString(),
    };

    if (isFirebaseConfigured) {
      try {
        const created = await createRapor({
          ofisId: yeniRapor.ofisId,
          musteriId: yeniRapor.musteriId,
          musteriAdi: yeniRapor.musteriAdi,
          tip: yeniRapor.tip,
          donem: yeniRapor.donem,
          donemBaslangic: yeniRapor.donemBaslangic,
          donemBitis: yeniRapor.donemBitis,
        });
        yeniRapor.id = created.id;
      } catch (error) {
        console.error(error);
        toast.error("Rapor kaydı oluşturulamadı", parseFirestoreError(error));
        return;
      }
    } else {
      setRaporlar((prev) => [yeniRapor, ...prev]);
    }

    toast.info("Rapor üretiliyor...", `${RAPOR_TIP_LABELS[tip]} hazırlanıyor`);
    setTimeout(() => {
      finalizeRapor(yeniRapor)
        .then(async () => {
          toast.success("Rapor hazır!", "PDF dosyası oluşturuldu ve gönderim için hazır");
          // Rapor hazır → ayara göre otomatik WhatsApp gönder veya onay kuyruğuna al
          const telefon = musteri.gsm1 || musteri.telefon;
          if (telefon) {
            try {
              const sonuc = await whatsappGonderimYurut({
                ayar: whatsappEntegrasyonAyarlari[0],
                tur: "rapor",
                ofisId: user?.ofisId,
                musteriId: musteri.id,
                musteriAdi: musteri.firmaAdi,
                telefon,
                mesaj: buildRaporWhatsAppMessage({ musteriAdi: musteri.firmaAdi, donem, raporTuru: RAPOR_TIP_LABELS[tip] }, whatsappEntegrasyonAyarlari[0]),
                sablonId: "rapor",
                icerikRef: yeniRapor.id,
                firebaseAcik: isFirebaseConfigured,
              });
              if (sonuc.karar === "otomatik" && sonuc.gonderildi) toast.success("Rapor WhatsApp ile gönderildi", musteri.firmaAdi);
              else if (sonuc.karar === "onay_bekle") toast.info("Rapor mesajı onay kuyruğuna eklendi", musteri.firmaAdi);
            } catch {
              /* WhatsApp hatası rapor üretimini engellemez */
            }
          }
        })
        .catch((error) => {
          console.error(error);
          toast.error("Rapor PDF'i oluşturulamadı", parseFirestoreError(error));
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
        toast.error("Rapor gönderim durumu güncellenemedi", parseFirestoreError(error));
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
        toast.error("E-posta gönderim kaydı oluşturulamadı", parseFirestoreError(error));
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

  if (loading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Rapor Merkezi"
        subtitle="Rapor üretimi ve gönderim yönetimi"
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Raporlar" }]}
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
            {canRapor && (
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => openRaporModal("operasyon")}>Rapor Oluştur</Button>
            )}
          </div>
        }
      />

      <StatsDrawer
        title="Rapor İstatistikleri"
        subtitle="Bu ayki üretim ve gönderim özeti"
        metrics={metrics}
      />

      {/* Şablonlar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Hızlı Rapor Üret</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(RAPOR_TIP_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => openRaporModal(key)}
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
        <MobileList empty={filtered.length === 0}>
          {filtered.map((r) => (
            <MobileCard key={r.id} className={selected.includes(r.id) ? "bg-blue-50/60" : ""}>
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="mt-1 rounded border-slate-300"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{r.musteriAdi}</span>
                    <span className="mt-1 block text-xs text-slate-500">{RAPOR_TIP_LABELS[r.tip]}</span>
                  </span>
                </label>
                <RaporDurumBadge durum={r.durum} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MobileField label="Dönem">{r.donem}</MobileField>
                <MobileField label="Oluşturulma">{formatTarih(r.olusturmaTarihi)}</MobileField>
                <MobileField label="Gönderim">
                  {r.gonderimTarihi ? formatTarih(r.gonderimTarihi) : "—"}
                </MobileField>
                <MobileField label="Kanal">
                  {r.kanal ? (
                    <Badge variant={r.kanal === "whatsapp" ? "success" : "info"}>
                      {KANAL_LABEL[r.kanal] ?? r.kanal}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </MobileField>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.durum === "hazir" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected([r.id]);
                        setShowWaModal(true);
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEmailGonder(r)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700"
                    >
                      <Send className="w-3.5 h-3.5" />
                      E-posta
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleIndir(r)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  İndir
                </button>
              </div>
            </MobileCard>
          ))}
        </MobileList>
        <Table className="hidden md:block">
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
              <TableEmpty colSpan={9} message="Rapor kaydı bulunamadı" />
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
        <MobileList empty={gonderimler.length === 0} emptyMessage="Henüz gönderim kaydı yok">
          {[...gonderimler]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((g) => (
              <MobileCard key={g.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{g.musteriAdi}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTarih(g.createdAt)}</p>
                  </div>
                  <Badge variant={g.durum === "gonderildi" ? "success" : g.durum === "basarisiz" ? "danger" : "neutral"}>
                    {GONDERIM_DURUM_LABEL[g.durum] ?? g.durum}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MobileField label="Kanal">
                    <Badge variant={g.kanal === "whatsapp" ? "success" : "info"}>{KANAL_LABEL[g.kanal] ?? g.kanal}</Badge>
                  </MobileField>
                  <MobileField label="Şablon">{g.sablonId ?? "—"}</MobileField>
                  <MobileField label="Deneme">{g.denemeSayisi}</MobileField>
                  <MobileField label="Hata">{g.hataMesaji ?? "—"}</MobileField>
                </div>
              </MobileCard>
            ))}
        </MobileList>
        <Table className="hidden md:block">
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
                      <Badge variant={g.kanal === "whatsapp" ? "success" : "info"}>{KANAL_LABEL[g.kanal] ?? g.kanal}</Badge>
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

      <Modal
        open={showRaporModal}
        onClose={() => setShowRaporModal(false)}
        title="Rapor Oluştur"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rapor Türü</label>
            <select
              value={raporModalTip}
              onChange={(e) => setRaporModalTip(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(RAPOR_TIP_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Müşteri</label>
            <select
              value={secilenMusteriId}
              onChange={(e) => setSecilenMusteriId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {musteriler.map((m) => (
                <option key={m.id} value={m.id}>{m.firmaAdi}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Dönem Tipi</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDonemTipi("aylik")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  donemTipi === "aylik"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Aylık
              </button>
              <button
                type="button"
                onClick={() => setDonemTipi("yillik")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  donemTipi === "yillik"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Yıllık
              </button>
            </div>
          </div>
          {donemTipi === "aylik" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ay</label>
              <input
                type="month"
                value={secilenDonem}
                onChange={(e) => setSecilenDonem(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yıl</label>
              <input
                type="number"
                min="2020"
                max="2100"
                step="1"
                value={secilenYil}
                onChange={(e) => setSecilenYil(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">Tüm yılın özet raporu üretilir (Ocak–Aralık)</p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setShowRaporModal(false)}>İptal</Button>
            <Button
              onClick={() => {
                const donem = donemTipi === "aylik" ? monthToDonem(secilenDonem) : `Yıllık ${secilenYil}`;
                const aralik = donemAraligiHesapla(donemTipi, secilenDonem, secilenYil);
                handleRaporUret(raporModalTip, secilenMusteriId, donem, aralik ?? undefined);
              }}
              disabled={!secilenMusteriId || (donemTipi === "aylik" ? !secilenDonem : !secilenYil)}
            >
              Üret
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
