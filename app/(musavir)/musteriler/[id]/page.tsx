"use client";

import { useState } from "react";
import { ArrowLeft, Phone, Mail, MapPin, Edit, MoreHorizontal, AlertCircle, Plus, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge, RiskBadge, TahsilatBadge, TebligatBadge, BeyannameBadge, GorevDurumBadge, RaporDurumBadge } from "@/components/ui/Badge";
import { RiskMetre } from "@/components/ui/RiskMetre";
import { Button } from "@/components/ui/Button";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { GorevDetayDrawer } from "@/components/modals/GorevDetayDrawer";
import { useToast } from "@/lib/context/ToastContext";
import {
  MOCK_MUSTERILER, MOCK_GOREVLER, MOCK_TEBLIGATLAR, MOCK_BEYANNAMELER, MOCK_RAPORLAR, MOCK_TAHSILATLAR
} from "@/lib/data/mock";
import { formatTarih, formatPara } from "@/lib/utils/format";
import type { Gorev, GorevDurum } from "@/lib/types";

const TABS = ["Özet", "Görevler", "Tebligatlar", "Beyannameler", "Raporlar", "Tahsilat"];

export default function MusteriDetayPage({ params }: { params: { id: string } }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("Özet");
  const [showGorevModal, setShowGorevModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Gorev | null>(null);
  const musteri = MOCK_MUSTERILER.find((m) => m.id === params.id) ?? MOCK_MUSTERILER[0];

  const gorevler = MOCK_GOREVLER.filter((g) => g.musteriId === musteri.id);
  const tebligatlar = MOCK_TEBLIGATLAR.filter((t) => t.musteriId === musteri.id);
  const beyanlar = MOCK_BEYANNAMELER.filter((b) => b.musteriId === musteri.id);
  const raporlar = MOCK_RAPORLAR.filter((r) => r.musteriId === musteri.id);
  const tahsilatlar = MOCK_TAHSILATLAR.filter((t) => t.musteriId === musteri.id);

  const riskSinyalleri = [
    musteri.gecikmisPesinat && { label: "Gecikmeli peşinat vergisi", puan: 20 },
    musteri.tahsilatDurumu === "gecikti" && { label: "Müşavir ücreti gecikmiş", puan: 15 },
    tebligatlar.some((t) => t.durum === "yeni") && { label: "İşlenmemiş tebligat mevcut", puan: 25 },
    beyanlar.some((b) => b.durum === "gecikti") && { label: "Gecikmiş beyanname", puan: 30 },
  ].filter(Boolean) as { label: string; puan: number }[];

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/musteriler"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Müşteri Listesi
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{musteri.firmaAdi}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {musteri.vknTckn}
            </span>
            <Badge variant={musteri.durum === "aktif" ? "success" : "neutral"}>{musteri.durum}</Badge>
            <RiskBadge seviye={musteri.riskSeviyesi} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<MessageCircle className="w-3.5 h-3.5" />}
            onClick={() => setShowWaModal(true)}
          >
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowGorevModal(true)}
          >
            Görev Ekle
          </Button>
          <Button variant="outline" size="sm" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => toast.info("Düzenleme modu")}>Düzenle</Button>
          <Button variant="outline" size="sm" icon={<MoreHorizontal className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* Üst bilgi kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Risk Skoru</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-slate-900">{musteri.riskSkoru}</span>
            <span className="text-xs text-slate-500">/100</span>
          </div>
          <RiskMetre skor={musteri.riskSkoru} seviye={musteri.riskSeviyesi} size="md" />
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Tahsilat Durumu</p>
          <TahsilatBadge durum={musteri.tahsilatDurumu} />
          <p className="text-xs text-slate-400 mt-2">Sorumlu: {musteri.sorumluPersonel}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Aktif Görevler</p>
          <p className="text-2xl font-bold text-slate-900">
            {gorevler.filter((g) => g.durum !== "tamamlandi").length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {gorevler.filter((g) => g.oncelik === "kritik").length} kritik
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Bekleyen Tebligat</p>
          <p className="text-2xl font-bold text-slate-900">
            {tebligatlar.filter((t) => t.durum === "yeni").length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Son: {tebligatlar[0] ? formatTarih(tebligatlar[0].tarih) : "—"}</p>
        </Card>
      </div>

      {/* Tab navigasyon */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab içeriği */}
      {activeTab === "Özet" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Firma Bilgileri</h3>
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
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Son Görevler</h3>
              {gorevler.length === 0 ? (
                <p className="text-xs text-slate-400">Görev bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {gorevler.slice(0, 3).map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{g.baslik}</p>
                        <p className="text-xs text-slate-400">Son: {formatTarih(g.terminTarihi)} · {g.atananKisi}</p>
                      </div>
                      <GorevDurumBadge durum={g.durum} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            {/* Risk sinyalleri */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-800">Risk Sinyalleri</h3>
              </div>
              {riskSinyalleri.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-600 text-xs font-medium">✓ Risk sinyali bulunmuyor</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {riskSinyalleri.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xs text-red-700">{s.label}</p>
                      <span className="text-xs font-bold text-red-600">+{s.puan}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* İletişim */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">İletişim</h3>
              <div className="space-y-2.5">
                <a href={`tel:${musteri.telefon}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {musteri.telefon}
                </a>
                <a href={`mailto:${musteri.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {musteri.email}
                </a>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  {musteri.adres}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs">WhatsApp</Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs">E-posta</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "Görevler" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
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
              {gorevler.length === 0 ? (
                <TableEmpty colSpan={6} />
              ) : (
                gorevler.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell><span className="text-xs font-medium text-slate-800">{g.baslik}</span></TableCell>
                    <TableCell><Badge variant="info">{g.tip}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={g.oncelik === "kritik" ? "danger" : g.oncelik === "yuksek" ? "warning" : "neutral"}>
                        {g.oncelik}
                      </Badge>
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-600">{g.atananKisi}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-700">{formatTarih(g.terminTarihi)}</span></TableCell>
                    <TableCell><GorevDurumBadge durum={g.durum} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "Tebligatlar" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tarih</TableHeadCell>
                <TableHeadCell>Başlık</TableHeadCell>
                <TableHeadCell>Tür</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {tebligatlar.length === 0 ? (
                <TableEmpty colSpan={4} />
              ) : (
                tebligatlar.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><span className="text-xs text-slate-600">{formatTarih(t.tarih)}</span></TableCell>
                    <TableCell><span className="text-xs font-medium text-slate-800">{t.baslik}</span></TableCell>
                    <TableCell><Badge variant="neutral">{t.tur}</Badge></TableCell>
                    <TableCell><TebligatBadge durum={t.durum} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "Beyannameler" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
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
              {beyanlar.length === 0 ? (
                <TableEmpty colSpan={6} />
              ) : (
                beyanlar.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell><Badge variant="info">{b.tur}</Badge></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{b.donem}</span></TableCell>
                    <TableCell><span className="text-xs font-medium text-slate-700">{formatTarih(b.sonTarih)}</span></TableCell>
                    <TableCell>
                      {b.vergiTutari ? (
                        <span className="text-xs font-medium text-slate-800">{formatPara(b.vergiTutari)}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </TableCell>
                    <TableCell><span className="text-xs text-slate-600">{b.sorumlu}</span></TableCell>
                    <TableCell><BeyannameBadge durum={b.durum} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "Raporlar" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
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
                <TableEmpty colSpan={6} />
              ) : (
                raporlar.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="info">{r.tip.replace("_", " ")}</Badge></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{r.donem}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{formatTarih(r.olusturmaTarihi)}</span></TableCell>
                    <TableCell>
                      {r.gonderimTarihi ? (
                        <span className="text-xs text-slate-600">{formatTarih(r.gonderimTarihi)}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.kanal ? <Badge variant="neutral">{r.kanal}</Badge> : <span className="text-xs text-slate-400">—</span>}
                    </TableCell>
                    <TableCell><RaporDurumBadge durum={r.durum} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "Tahsilat" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Dönem</TableHeadCell>
                <TableHeadCell>Tutar</TableHeadCell>
                <TableHeadCell>Vade Tarihi</TableHeadCell>
                <TableHeadCell>Ödeme Tarihi</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Notlar</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {tahsilatlar.length === 0 ? (
                <TableEmpty colSpan={6} />
              ) : (
                tahsilatlar.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><span className="text-xs text-slate-600">{t.donem}</span></TableCell>
                    <TableCell><span className="text-xs font-semibold text-slate-800">{formatPara(t.tutar)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{formatTarih(t.vadeTarihi)}</span></TableCell>
                    <TableCell>
                      {t.odemeTarihi ? (
                        <span className="text-xs text-emerald-600">{formatTarih(t.odemeTarihi)}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </TableCell>
                    <TableCell><TahsilatBadge durum={t.durum} /></TableCell>
                    <TableCell>
                      {t.notlar ? (
                        <span className="text-xs text-slate-500">{t.notlar}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
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
      />
    </div>
  );
}
