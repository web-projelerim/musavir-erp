"use client";

import { useState } from "react";
import { ArrowLeft, Phone, Mail, MapPin, Edit, MoreHorizontal, AlertCircle, Plus,
  MessageCircle, RefreshCw, CheckCircle, CreditCard } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge, RiskBadge, TahsilatBadge, TebligatBadge, BeyannameBadge,
  GorevDurumBadge, RaporDurumBadge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import { Button } from "@/components/ui/Button";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { GorevDetayDrawer } from "@/components/modals/GorevDetayDrawer";
import { useMusteri } from "@/lib/hooks/useMusteriler";
import { useMusteriGorevleri } from "@/lib/hooks/useGorevler";
import { useMusteriTebligatlari } from "@/lib/hooks/useTebligatlar";
import { useMusteriBeyannameleri } from "@/lib/hooks/useBeyannameler";
import { useMusteriTahsilatlari } from "@/lib/hooks/useTahsilatlar";
import { tebligatDurumGuncelle } from "@/lib/services/tebligat.service";
import { tahsilatOdendi } from "@/lib/services/tahsilat.service";
import { GIB, gibMockMu } from "@/lib/integrations/gib";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import { useToast } from "@/lib/context/ToastContext";
import { formatTarih, formatPara } from "@/lib/utils/format";
import type { Gorev, GorevDurum } from "@/lib/types";

const TABS = ["Özet", "Görevler", "Tebligatlar", "Beyannameler", "Raporlar", "Tahsilat"];

export default function MusteriDetayPage({ params }: { params: { id: string } }) {
  const toast = useToast();
  const { data: musteri, loading: musteriLoading } = useMusteri(params.id);
  const { data: gorevler, loading: gorevLoading } = useMusteriGorevleri(params.id);
  const { data: tebligatlar, loading: tebLoading } = useMusteriTebligatlari(params.id);
  const { data: beyanlar, loading: beyanLoading } = useMusteriBeyannameleri(params.id);
  const { data: tahsilatlar, loading: tahLoading } = useMusteriTahsilatlari(params.id);

  const [activeTab, setActiveTab] = useState("Özet");
  const [showGorevModal, setShowGorevModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Gorev | null>(null);
  const [gibSenkronize, setGibSenkronize] = useState(false);
  const [isleniyorId, setIsleniyorId] = useState<string | null>(null);
  const [odenenId, setOdenenId] = useState<string | null>(null);

  const raporlar = [] as any[]; // raporlar ayrı hook yoksa boş bırak

  const riskSinyalleri = [
    musteri.gecikmisPesinat && { label: "Gecikmeli peşinat vergisi", puan: 20 },
    musteri.tahsilatDurumu === "gecikti" && { label: "Müşavir ücreti gecikmiş", puan: 15 },
    tebligatlar.some((t) => t.durum === "yeni") && { label: "İşlenmemiş tebligat mevcut", puan: 25 },
    beyanlar.some((b) => b.durum === "gecikti") && { label: "Gecikmiş beyanname", puan: 30 },
  ].filter(Boolean) as { label: string; puan: number }[];

  const handleGibSenkronize = async () => {
    setGibSenkronize(true);
    try {
      if (gibMockMu()) {
        await new Promise((r) => setTimeout(r, 1200));
        toast.info("Test modu aktif", "GİB API bağlantısı henüz yapılandırılmadı — mock veri kullanıldı");
      } else {
        await GIB.mukellefSorgula(musteri.vknTckn);
        toast.success("GİB Senkronize edildi", "Tebligat ve beyanname verileri güncellendi");
      }
    } catch {
      toast.error("GİB bağlantı hatası", "API anahtarını kontrol edin");
    } finally {
      setGibSenkronize(false);
    }
  };

  const handleTebligatIslendi = async (id: string) => {
    setIsleniyorId(id);
    try {
      if (FB_CONFIGURED) await tebligatDurumGuncelle(id, "islendi");
      toast.success("Tebligat işlendi");
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setIsleniyorId(null);
    }
  };

  const handleTahsilatOdendi = async (id: string) => {
    setOdenenId(id);
    try {
      if (FB_CONFIGURED) await tahsilatOdendi(id);
      toast.success("Ödeme kaydedildi");
    } catch {
      toast.error("Kayıt başarısız");
    } finally {
      setOdenenId(null);
    }
  };

  const handleDurumGuncelle = (id: string, durum: GorevDurum) => {
    // optimistic update handled by drawer
  };

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: "8px 14px", fontSize: 12, fontWeight: 500,
    border: "none", background: "transparent", cursor: "pointer",
    borderBottom: `2px solid ${activeTab === tab ? "#2563eb" : "transparent"}`,
    color: activeTab === tab ? "#2563eb" : "#6b7280",
    marginBottom: -1,
  });

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <Link href="/musteriler"
            style={{ display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, color: "#6b7280", marginBottom: 8, textDecoration: "none" }}>
            <ArrowLeft style={{ width: 12, height: 12 }} />
            Müşteri Listesi
          </Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{musteri.firmaAdi}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280",
              background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
              {musteri.vknTckn}
            </span>
            <Badge variant={musteri.durum === "aktif" ? "success" : "neutral"}>{musteri.durum}</Badge>
            <RiskBadge seviye={musteri.riskSeviyesi} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            icon={<RefreshCw style={{ width: 12, height: 12 }} className={gibSenkronize ? "animate-spin" : ""} />}
            onClick={handleGibSenkronize}
            loading={gibSenkronize}>
            GİB Senkronize
          </Button>
          <Button variant="outline" size="sm"
            icon={<MessageCircle style={{ width: 12, height: 12 }} />}
            onClick={() => setShowWaModal(true)}>
            WhatsApp
          </Button>
          <Button variant="outline" size="sm"
            icon={<Plus style={{ width: 12, height: 12 }} />}
            onClick={() => setShowGorevModal(true)}>
            Görev Ekle
          </Button>
          <Button variant="outline" size="sm"
            icon={<Edit style={{ width: 12, height: 12 }} />}
            onClick={() => toast.info("Düzenleme modu")}>
            Düzenle
          </Button>
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4">
          <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 6 }}>Risk Skoru</p>
          <div className="flex items-end gap-1 mb-2">
            <span style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{musteri.riskSkoru}</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>/100</span>
          </div>
          <RiskMetre skor={musteri.riskSkoru} seviye={musteri.riskSeviyesi} size="md" />
        </Card>
        <Card className="!p-4">
          <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 6 }}>Tahsilat</p>
          <TahsilatBadge durum={musteri.tahsilatDurumu} />
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            Sorumlu: {musteri.sorumluPersonel}
          </p>
        </Card>
        <Card className="!p-4">
          <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 6 }}>Aktif Görevler</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {gorevler.filter((g) => g.durum !== "tamamlandi").length}
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            {gorevler.filter((g) => g.oncelik === "kritik").length} kritik
          </p>
        </Card>
        <Card className="!p-4">
          <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.05em", marginBottom: 6 }}>Bekleyen Tebligat</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {tebligatlar.filter((t) => t.durum === "yeni").length}
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            Son: {tebligatlar[0] ? formatTarih(tebligatlar[0].tarih) : "—"}
          </p>
        </Card>
      </div>

      {/* Tab navigasyon */}
      <div className="mb-5" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <nav className="flex">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Özet */}
      {activeTab === "Özet" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 14 }}>
                Firma Bilgileri
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Yetkili Kişi", value: musteri.yetkiliAd },
                  { label: "E-posta", value: musteri.email },
                  { label: "Telefon", value: musteri.telefon },
                  { label: "Adres", value: musteri.adres },
                  { label: "KDV Mükellefi", value: musteri.kdvMukellef ? "Evet" : "Hayır" },
                  { label: "Muhtasar Mükellefi", value: musteri.muhtasarMukellef ? "Evet" : "Hayır" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                Son Görevler
              </h3>
              {gorevLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="skeleton rounded" style={{ height: 44 }} />)}
                </div>
              ) : gorevler.length === 0 ? (
                <p style={{ fontSize: 11, color: "#9ca3af" }}>Görev bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {gorevler.slice(0, 3).map((g) => (
                    <div key={g.id} onClick={() => setSeciliGorev(g)}
                      className="flex items-center justify-between cursor-pointer rounded-md"
                      style={{ background: "#f9fafb", padding: "8px 10px" }}>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}
                          className="truncate">{g.baslik}</p>
                        <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                          Son: {formatTarih(g.terminTarihi)} · {g.atananKisi}
                        </p>
                      </div>
                      <GorevDurumBadge durum={g.durum} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle style={{ width: 13, height: 13, color: "#f97316" }} />
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Risk Sinyalleri</h3>
              </div>
              {riskSinyalleri.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md"
                  style={{ background: "#f0fdf4", padding: "10px 12px" }}>
                  <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 500 }}>
                    ✓ Risk sinyali bulunmuyor
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {riskSinyalleri.map((s, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md"
                      style={{ background: "#fef2f2", border: "1px solid #fecaca",
                        padding: "8px 10px" }}>
                      <p style={{ fontSize: 11, color: "#b91c1c" }}>{s.label}</p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>+{s.puan}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
                İletişim
              </h3>
              <div className="space-y-2">
                <a href={`tel:${musteri.telefon}`}
                  style={{ display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
                  <Phone style={{ width: 12, height: 12, color: "#d1d5db" }} />
                  {musteri.telefon}
                </a>
                <a href={`mailto:${musteri.email}`}
                  style={{ display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12, color: "#6b7280", textDecoration: "none" }}>
                  <Mail style={{ width: 12, height: 12, color: "#d1d5db" }} />
                  {musteri.email}
                </a>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8,
                  fontSize: 12, color: "#6b7280" }}>
                  <MapPin style={{ width: 12, height: 12, color: "#d1d5db", marginTop: 2, flexShrink: 0 }} />
                  {musteri.adres}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #f3f4f6" }}>
                <Button variant="outline" size="sm" onClick={() => setShowWaModal(true)}
                  style={{ flex: 1, fontSize: 11 }}>WhatsApp</Button>
                <a href={`mailto:${musteri.email}`} style={{ flex: 1 }}>
                  <Button variant="outline" size="sm" style={{ width: "100%", fontSize: 11 }}>
                    E-posta
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Görevler */}
      {activeTab === "Görevler" && (
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Başlık</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Öncelik</TableHeadCell>
                <TableHeadCell>Atanan</TableHeadCell>
                <TableHeadCell>Termin</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {gorevLoading ? (
                <SkeletonTable rows={4} cols={6} />
              ) : gorevler.length === 0 ? (
                <TableEmpty colSpan={6} message="Görev bulunamadı" />
              ) : (
                gorevler.map((g) => (
                  <TableRow key={g.id} onClick={() => setSeciliGorev(g)} className="cursor-pointer">
                    <TableCell>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{g.baslik}</span>
                    </TableCell>
                    <TableCell><Badge variant="info">{g.tip}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={g.oncelik === "kritik" ? "danger" : g.oncelik === "yuksek" ? "warning" : "neutral"}>
                        {g.oncelik}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{g.atananKisi}</span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#374151" }}>{formatTarih(g.terminTarihi)}</span>
                    </TableCell>
                    <TableCell><GorevDurumBadge durum={g.durum} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tebligatlar */}
      {activeTab === "Tebligatlar" && (
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tarih</TableHeadCell>
                <TableHeadCell>Başlık</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>İşlem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {tebLoading ? (
                <SkeletonTable rows={4} cols={5} />
              ) : tebligatlar.length === 0 ? (
                <TableEmpty colSpan={5} message="Tebligat bulunamadı" />
              ) : (
                tebligatlar.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{formatTarih(t.tarih)}</span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{t.baslik}</span>
                    </TableCell>
                    <TableCell><Badge variant="neutral">{t.tur}</Badge></TableCell>
                    <TableCell><TebligatBadge durum={t.durum} /></TableCell>
                    <TableCell>
                      {t.durum !== "islendi" && (
                        <button onClick={() => handleTebligatIslendi(t.id)}
                          disabled={isleniyorId === t.id}
                          style={{ padding: "4px 8px", fontSize: 11, color: "#16a34a",
                            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4,
                            cursor: isleniyorId === t.id ? "not-allowed" : "pointer",
                            opacity: isleniyorId === t.id ? 0.6 : 1, display: "flex",
                            alignItems: "center", gap: 4 }}>
                          <CheckCircle style={{ width: 11, height: 11 }} />
                          İşlendi
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Beyannameler */}
      {activeTab === "Beyannameler" && (
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Dönem</TableHeadCell>
                <TableHeadCell>Son Tarih</TableHeadCell>
                <TableHeadCell>Vergi Tutarı</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {beyanLoading ? (
                <SkeletonTable rows={4} cols={6} />
              ) : beyanlar.length === 0 ? (
                <TableEmpty colSpan={6} message="Beyanname bulunamadı" />
              ) : (
                beyanlar.map((b) => (
                  <TableRow key={b.id}>
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
                      {b.vergiTutari ? (
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                          {formatPara(b.vergiTutari)}
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

      {/* Raporlar */}
      {activeTab === "Raporlar" && (
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Dönem</TableHeadCell>
                <TableHeadCell>Oluşturma</TableHeadCell>
                <TableHeadCell>Gönderim</TableHeadCell>
                <TableHeadCell>Kanal</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {raporlar.length === 0 ? (
                <TableEmpty colSpan={6} message="Bu müşteri için rapor bulunamadı" />
              ) : (
                raporlar.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="info">{r.tip.replace("_", " ")}</Badge></TableCell>
                    <TableCell><span style={{ fontSize: 11, color: "#6b7280" }}>{r.donem}</span></TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{formatTarih(r.olusturmaTarihi)}</span>
                    </TableCell>
                    <TableCell>
                      {r.gonderimTarihi ? (
                        <span style={{ fontSize: 11, color: "#16a34a" }}>{formatTarih(r.gonderimTarihi)}</span>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell>
                      {r.kanal ? <Badge variant="neutral">{r.kanal}</Badge>
                        : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell><RaporDurumBadge durum={r.durum} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Tahsilat */}
      {activeTab === "Tahsilat" && (
        <div className="bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Dönem</TableHeadCell>
                <TableHeadCell>Tutar</TableHeadCell>
                <TableHeadCell>Vade Tarihi</TableHeadCell>
                <TableHeadCell>Ödeme Tarihi</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Notlar</TableHeadCell>
                <TableHeadCell>İşlem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {tahLoading ? (
                <SkeletonTable rows={4} cols={7} />
              ) : tahsilatlar.length === 0 ? (
                <TableEmpty colSpan={7} message="Tahsilat kaydı bulunamadı" />
              ) : (
                tahsilatlar.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{t.donem}</span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                        {formatPara(t.tutar)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{formatTarih(t.vadeTarihi)}</span>
                    </TableCell>
                    <TableCell>
                      {t.odemeTarihi ? (
                        <span style={{ fontSize: 11, color: "#16a34a" }}>{formatTarih(t.odemeTarihi)}</span>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell><TahsilatBadge durum={t.durum} /></TableCell>
                    <TableCell>
                      {t.notlar ? (
                        <span style={{ fontSize: 11, color: "#6b7280" }}>{t.notlar}</span>
                      ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
                    </TableCell>
                    <TableCell>
                      {t.durum !== "odendi" && (
                        <button onClick={() => handleTahsilatOdendi(t.id)}
                          disabled={odenenId === t.id}
                          style={{ padding: "4px 8px", fontSize: 11, color: "#2563eb",
                            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4,
                            cursor: odenenId === t.id ? "not-allowed" : "pointer",
                            opacity: odenenId === t.id ? 0.6 : 1, display: "flex",
                            alignItems: "center", gap: 4 }}>
                          <CreditCard style={{ width: 11, height: 11 }} />
                          Ödendi
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modaller */}
      <YeniGorevModal
        open={showGorevModal}
        onClose={() => setShowGorevModal(false)}
        musteriId={musteri.id}
        onSuccess={() => toast.success("Görev oluşturuldu")}
      />
      <WhatsAppGonderimModal
        open={showWaModal}
        onClose={() => setShowWaModal(false)}
        musteriId={musteri.id}
      />
      <GorevDetayDrawer
        gorev={seciliGorev}
        onClose={() => setSeciliGorev(null)}
        onDurumGuncelle={handleDurumGuncelle}
      />
    </div>
  );
}
