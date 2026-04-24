"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Bell,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  MessageSquare,
  Upload,
  LogOut,
} from "lucide-react";
import { Badge, BeyannameBadge, TahsilatBadge, RaporDurumBadge } from "@/components/ui/Badge";
import { MetricCard, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BelgeUploadModal } from "@/components/modals/BelgeUploadModal";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { hesaplaMusteriRisk } from "@/lib/domain/risk";
import { tahakkukKalemLabel, tahakkukTuruLabel } from "@/lib/domain/tahakkuk";
import { buildReportPdfBlob, buildReportPdfFileName, downloadPdfBlob } from "@/lib/reports/pdfReport";
import { formatTarih, formatPara } from "@/lib/utils/format";
import type { Belge, Rapor } from "@/lib/types";

function formatDosyaBoyutu(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MukellefPanelPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    musteriler,
    beyannameler,
    tebligatlar: tumTebligatlar,
    raporlar: tumRaporlar,
    tahsilatlar: tumTahsilatlar,
    tahakkuklar: tumTahakkuklar,
    odemeler: tumOdemeler,
    belgeler: tumBelgeler,
    gorevler: tumGorevler,
    kdv2,
  } = useAppData();
  const [showBelgeModal, setShowBelgeModal] = useState(false);
  const [localBelgeler, setLocalBelgeler] = useState<Belge[]>(tumBelgeler);

  useEffect(() => {
    setLocalBelgeler(tumBelgeler);
  }, [tumBelgeler]);

  const musteri = musteriler.find((m) => m.id === user?.musteriId) ?? musteriler[0];

  if (!musteri) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8">
          <h1 className="text-lg font-bold text-slate-900">Firma kaydı bulunamadı</h1>
          <p className="text-sm text-slate-500 mt-1">Bu mükellef hesabına bağlı firma yok.</p>
        </div>
      </div>
    );
  }

  const beyanlar = beyannameler.filter((b) => b.musteriId === musteri.id);
  const tebligatlar = tumTebligatlar.filter((t) => t.musteriId === musteri.id);
  const raporlar = tumRaporlar.filter((r) => r.musteriId === musteri.id);
  const tahsilatlar = tumTahsilatlar.filter((t) => t.musteriId === musteri.id);
  const tahakkuklar = tumTahakkuklar.filter((t) => t.musteriId === musteri.id);
  const odemeler = tumOdemeler.filter((o) => o.musteriId === musteri.id);
  const gorevler = tumGorevler.filter((g) => g.musteriId === musteri.id);
  const belgeler = localBelgeler.filter((b) => b.musteriId === musteri.id && b.gorunurluk === "mukellef");
  const risk = hesaplaMusteriRisk({
    musteri,
    gorevler,
    beyannameler: beyanlar,
    tahsilatlar,
    tebligatlar,
    kdv2,
  });

  const handleRaporIndir = (rapor: Rapor) => {
    if (rapor.pdfUrl) {
      window.open(rapor.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const blob = buildReportPdfBlob({
      rapor,
      musteri,
      gorevler: [],
      beyannameler: beyanlar,
      tahsilatlar,
      tebligatlar,
      risk: { skor: risk.skor, seviye: risk.seviye },
    });
    downloadPdfBlob(blob, buildReportPdfFileName(rapor));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mükellef üst bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">MusavirERP</p>
              <p className="text-xs text-slate-500">Mükellef Portalı</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{musteri.yetkiliAd}</p>
              <p className="text-xs text-slate-500">{musteri.firmaAdi}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 text-xs font-bold">
                {musteri.yetkiliAd.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.replace("/giris");
              }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Firma özeti */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{musteri.firmaAdi}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  VKN: {musteri.vknTckn}
                </span>
                <Badge variant="success">Aktif Mükellef</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Mali Müşaviriniz</p>
              <p className="text-sm font-semibold text-slate-800">Ali Müşavir</p>
              <p className="text-xs text-slate-500">ali@musavir.com</p>
            </div>
          </div>
        </div>

        {/* Uyarı kutusu */}
        {(tebligatlar.some((t) => t.durum === "yeni") || beyanlar.some((b) => b.durum === "bekliyor")) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Dikkat Gerektiren Durumlar</p>
                <ul className="mt-1 space-y-1">
                  {tebligatlar.filter((t) => t.durum === "yeni").map((t) => (
                    <li key={t.id} className="text-xs text-amber-700">
                      • {t.baslik} — {formatTarih(t.tarih)}
                    </li>
                  ))}
                  {beyanlar.filter((b) => b.durum === "bekliyor").map((b) => (
                    <li key={b.id} className="text-xs text-amber-700">
                      • {b.tur} beyannamesi — Son tarih: {formatTarih(b.sonTarih)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Metrikler */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Bekleyen Beyan"
            value={beyanlar.filter((b) => b.durum === "bekliyor").length}
            subtitle="Yaklaşan son tarih"
            variant={beyanlar.some((b) => b.durum === "bekliyor") ? "warning" : "default"}
          />
          <MetricCard
            title="Yeni Tebligat"
            value={tebligatlar.filter((t) => t.durum === "yeni").length}
            subtitle="İşlem bekliyor"
            variant={tebligatlar.some((t) => t.durum === "yeni") ? "danger" : "default"}
          />
          <MetricCard
            title="Gönderilen Rapor"
            value={raporlar.filter((r) => r.durum === "gonderildi").length}
            subtitle="Bu dönem"
            variant="success"
          />
          <MetricCard
            title="Tahsilat Durumu"
            value={musteri.tahsilatDurumu === "odendi" ? "Ödendi" : musteri.tahsilatDurumu === "gecikti" ? "Gecikti" : "Bekliyor"}
            subtitle="Son dönem"
            variant={musteri.tahsilatDurumu === "gecikti" ? "danger" : musteri.tahsilatDurumu === "odendi" ? "success" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Beyannameler */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Beyanname Durumları</h3>
            </div>
            {beyanlar.length === 0 ? (
              <p className="text-xs text-slate-400">Beyanname kaydı bulunamadı</p>
            ) : (
              <div className="space-y-2.5">
                {beyanlar.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{b.tur}</span>
                        <span className="text-xs text-slate-500">— {b.donem}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Son Tarih: {formatTarih(b.sonTarih)}</p>
                    </div>
                    <BeyannameBadge durum={b.durum} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tebligatlar */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                Guncel Tahakkuklarim
              </h3>
            </div>
            {tahakkuklar.length === 0 ? (
              <p className="text-xs text-slate-400">Guncel tahakkuk bulunamadi</p>
            ) : (
              <div className="space-y-2.5">
                {tahakkuklar.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{t.donem}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{tahakkukKalemLabel(t)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Vade: {formatTarih(t.vadeTarihi)}</p>
                      </div>
                      <TahsilatBadge durum={t.durum === "odendi" ? "odendi" : t.durum === "kismi" ? "kismi" : t.durum === "gecikti" ? "gecikti" : "bekliyor"} />
                    </div>
                    <div className="mt-2">
                      <Badge variant={t.tahakkukTuru === "vergi" ? "warning" : "neutral"}>
                        {tahakkukTuruLabel(t.tahakkukTuru)}
                      </Badge>
                    </div>
                    {t.otomatikTuretilmis && (
                      <p className="mt-2 text-[11px] text-blue-500">Beyannameden otomatik turetildi</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-semibold">{formatPara(t.tutar)}</span>
                      <span className="text-slate-500">Odenen: {formatPara(t.odenenTutar ?? 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                E-Tebligatlar
              </h3>
            </div>
            {tebligatlar.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Bekleyen tebligat yok</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tebligatlar.map((t) => (
                  <div key={t.id} className="p-3 border border-slate-100 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{t.baslik}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.tur} · {formatTarih(t.tarih)}</p>
                      </div>
                      <Badge variant={t.durum === "yeni" ? "danger" : "neutral"}>
                        {t.durum === "yeni" ? "Yeni" : t.durum === "islendi" ? "İşlendi" : "Okundu"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Raporlar */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Gönderilen Raporlar
              </h3>
            </div>
            {raporlar.length === 0 ? (
              <p className="text-xs text-slate-400">Rapor bulunamadı</p>
            ) : (
              <div className="space-y-2.5">
                {raporlar.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{r.tip.replace("_", " ")}</p>
                      <p className="text-xs text-slate-500">{r.donem} · {formatTarih(r.olusturmaTarihi)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RaporDurumBadge durum={r.durum} />
                      {r.durum === "gonderildi" && (
                        <button
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                          onClick={() => handleRaporIndir(r)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Belgeler */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" />
                Belgelerim
              </h3>
              <Button
                size="sm"
                variant="outline"
                icon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => setShowBelgeModal(true)}
              >
                Yukle
              </Button>
            </div>
            {belgeler.length === 0 ? (
              <p className="text-xs text-slate-400">Paylasilan veya yuklenen belge yok</p>
            ) : (
              <div className="space-y-2.5">
                {belgeler.map((belge) => (
                  <div key={belge.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                    <div className="min-w-0 mr-3">
                      <p className="text-xs font-semibold text-slate-800 truncate">{belge.dosyaAdi}</p>
                      <p className="text-xs text-slate-500">
                        {belge.kategori} · {formatDosyaBoyutu(belge.boyut)} · {formatTarih(belge.createdAt)}
                      </p>
                    </div>
                    <a
                      href={belge.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tahsilat */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-500" />
                Ödeme Durumu
              </h3>
            </div>
            {tahsilatlar.length === 0 ? (
              <p className="text-xs text-slate-400">Kayıt bulunamadı</p>
            ) : (
              <div className="space-y-2.5">
                {tahsilatlar.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{t.donem}</p>
                      <p className="text-xs text-slate-500">Vade: {formatTarih(t.vadeTarihi)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatPara(t.tutar)}</p>
                      <TahsilatBadge durum={t.durum} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {odemeler.length > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-800">Sisteme islenen son banka hareketi</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {formatPara(odemeler[0].tutar)} · {formatTarih(odemeler[0].odemeTarihi)} · {odemeler[0].durum}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Müşavirden mesaj */}
        <div className="mt-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Müşavirden Duyurular</h3>
            </div>
            <div className="space-y-3">
              {[
                {
                  tarih: "2024-07-14",
                  mesaj: "Temmuz 2024 KDV beyannamesi için gerekli belgeleri lütfen 20 Temmuz'a kadar sisteme yükleyin.",
                },
                {
                  tarih: "2024-07-10",
                  mesaj: "E-tebligat gelen kutunuzu düzenli olarak kontrol etmenizi hatırlatırız.",
                },
              ].map((d, i) => (
                <div key={i} className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">AM</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-800">Ali Müşavir</span>
                      <span className="text-xs text-slate-400">{formatTarih(d.tarih)}</span>
                    </div>
                    <p className="text-xs text-slate-700">{d.mesaj}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
      <BelgeUploadModal
        open={showBelgeModal}
        onClose={() => setShowBelgeModal(false)}
        musteriId={musteri.id}
        defaultGorunurluk="mukellef"
        onUploaded={(belge) => setLocalBelgeler((prev) => [belge, ...prev])}
      />
    </div>
  );
}
