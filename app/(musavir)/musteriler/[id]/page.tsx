"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Phone, Mail, MapPin, Edit, MoreHorizontal, Plus, MessageCircle, Download, Trash2, UserPlus, CreditCard, FileText, CheckSquare, CalendarClock } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge, TahsilatBadge, TebligatBadge, BeyannameBadge, BeyanWorkflowBadge, GorevDurumBadge, RaporDurumBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { YeniGorevModal } from "@/components/modals/YeniGorevModal";
import { YeniMusteriModal } from "@/components/modals/YeniMusteriModal";
import { WhatsAppGonderimModal } from "@/components/modals/WhatsAppGonderimModal";
import { GorevDetayDrawer } from "@/components/modals/GorevDetayDrawer";
import { TahsilatModal } from "@/components/modals/TahsilatModal";
import { BelgeUploadModal } from "@/components/modals/BelgeUploadModal";
import { DavetModal } from "@/components/modals/DavetModal";
import { TahakkukModal } from "@/components/modals/TahakkukModal";
import { useToast } from "@/lib/context/ToastContext";
import { tahakkukKalemLabel, tahakkukTuruLabel } from "@/lib/domain/tahakkuk";
import { yukumlulukTipLabel, yukumlulukVariant } from "@/lib/domain/yukumluluk";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import {
  archiveMusteri,
  deleteBelge,
  deleteGorev,
  updateGorev,
  updateGorevDurum,
  updateBeyannameDurum,
  updateTahsilatDurum,
} from "@/lib/firebase/repositories";
import { deleteStorageFile } from "@/lib/firebase/storage";
import { normalizeGorevNotlar } from "@/lib/utils/gorev";
import { formatTarih, formatPara } from "@/lib/utils/format";
import { isMusavir } from "@/lib/utils/permissions";
import { useAuth } from "@/lib/context/AuthContext";
import type { Belge, BeyannameDurum, Gorev, GorevNot, Odeme, Tahakkuk, Tahsilat, TahsilatDurum } from "@/lib/types";

const TABS = ["Özet", "Yükümlülükler", "Görevler", "Belgeler", "Tebligatlar", "Beyannameler", "Raporlar", "Tahsilat", "Tahakkuk"];

function formatDosyaBoyutu(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MusteriDetayPage({ params }: { params: { id: string } }) {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { user } = useAuth();
  const canAdmin = isMusavir(user);
  const [activeTab, setActiveTab] = useState("Özet");
  const [showGorevModal, setShowGorevModal] = useState(false);
  const [showMusteriModal, setShowMusteriModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [showTahsilatModal, setShowTahsilatModal] = useState(false);
  const [showTahakkukModal, setShowTahakkukModal] = useState(false);
  const [showBelgeModal, setShowBelgeModal] = useState(false);
  const [showDavetModal, setShowDavetModal] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Gorev | null>(null);
  const [seciliTahsilat, setSeciliTahsilat] = useState<Tahsilat | null>(null);
  const {
    musteriler,
    kullanicilar,
    gorevler: tumGorevler,
    tebligatlar: tumTebligatlar,
    beyannameler: tumBeyanlar,
    raporlar: tumRaporlar,
    tahsilatlar: tumTahsilatlar,
    tahakkuklar: tumTahakkuklar,
    odemeler: tumOdemeler,
    belgeler: tumBelgeler,
    yukumlulukler: tumYukumlulukler,
    davetler,
    auditLogs,
    source,
    loading,
  } = useAppData();
  const [localGorevler, setLocalGorevler] = useState<Gorev[]>(tumGorevler);
  const [localTahsilatlar, setLocalTahsilatlar] = useState<Tahsilat[]>(tumTahsilatlar);
  const [localTahakkuklar, setLocalTahakkuklar] = useState<Tahakkuk[]>(tumTahakkuklar);
  const [localOdemeler, setLocalOdemeler] = useState<Odeme[]>(tumOdemeler);
  const [localBelgeler, setLocalBelgeler] = useState<Belge[]>(tumBelgeler);

  useEffect(() => {
    setLocalGorevler(tumGorevler);
  }, [tumGorevler]);

  useEffect(() => {
    setLocalTahsilatlar(tumTahsilatlar);
  }, [tumTahsilatlar]);

  useEffect(() => {
    setLocalTahakkuklar(tumTahakkuklar);
  }, [tumTahakkuklar]);

  useEffect(() => {
    setLocalOdemeler(tumOdemeler);
  }, [tumOdemeler]);

  useEffect(() => {
    setLocalBelgeler(tumBelgeler);
  }, [tumBelgeler]);

  const musteri = musteriler.find((m) => m.id === params.id);

  if (loading && !musteri) {
    return <PageLoading />;
  }

  if (!musteri) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-8">
        <Link href="/musteriler" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Müşteri Listesi
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Müşteri bulunamadı</h1>
        <p className="text-sm text-slate-500 mt-1">Bu ID ile eşleşen müşteri kaydı yok.</p>
      </div>
    );
  }

  const gorevler = localGorevler.filter((g) => g.musteriId === musteri.id);
  const tebligatlar = tumTebligatlar.filter((t) => t.musteriId === musteri.id);
  const beyanlar = tumBeyanlar.filter((b) => b.musteriId === musteri.id);
  const raporlar = tumRaporlar.filter((r) => r.musteriId === musteri.id);
  const tahsilatlar = localTahsilatlar.filter((t) => t.musteriId === musteri.id);
  const tahakkuklar = localTahakkuklar.filter((t) => t.musteriId === musteri.id);
  const odemeler = localOdemeler.filter((o) => o.musteriId === musteri.id);
  const belgeler = localBelgeler.filter((b) => b.musteriId === musteri.id);
  const yukumlulukler = tumYukumlulukler.filter((item) => item.musteriId === musteri.id);
  const aktifDavet = davetler.find((d) => d.musteriId === musteri.id && d.durum === "bekliyor");
  const musteriAudit = auditLogs
    .filter((log) => log.entityId === musteri.id || log.after?.musteriId === musteri.id || log.entityLabel === musteri.firmaAdi)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  // Yaklaşan sorumluluklar: beyanname + görev + tahsilat tarihlerine göre sıralı
  type SorumlulukItem = { tarih: string; tur: "beyanname" | "gorev" | "tahsilat"; etiket: string };
  const yaklasanSorumluluklar: SorumlulukItem[] = [
    ...beyanlar
      .filter((b) => b.durum === "bekliyor")
      .map((b) => ({ tarih: b.sonTarih, tur: "beyanname" as const, etiket: `${b.tur} beyanname` })),
    ...gorevler
      .filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal")
      .map((g) => ({ tarih: g.terminTarihi, tur: "gorev" as const, etiket: g.baslik })),
    ...tahsilatlar
      .filter((t) => t.durum === "bekliyor")
      .map((t) => ({ tarih: t.vadeTarihi, tur: "tahsilat" as const, etiket: `₺${Number(t.tutar).toLocaleString("tr-TR")} tahsilat` })),
  ]
    .filter((item) => !isNaN(new Date(item.tarih).getTime()))
    .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())
    .slice(0, 6);

  const enYakinSorumluluk = yaklasanSorumluluklar[0] ?? null;

  const runFirebaseAction = async (action: () => Promise<void>, successMessage: string) => {
    if (!isFirebaseConfigured) {
      toast.info("Demo modu", "Firebase env girilince bu işlem Firestore'a kaydedilecek");
      return;
    }

    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("İşlem kaydedilemedi", parseFirestoreError(error));
    }
  };

  const handleBeyanDurum = (id: string, durum: BeyannameDurum) => {
    const beyan = beyanlar.find((item) => item.id === id);
    runFirebaseAction(
      async () => {
        await updateBeyannameDurum(id, durum);
        await logAudit({
          action: "status_change",
          entityType: "beyanname",
          entityId: id,
          entityLabel: beyan ? `${beyan.tur} - ${beyan.donem}` : undefined,
          summary: `Beyanname durumu ${durum} olarak güncellendi`,
          before: beyan ? { durum: beyan.durum } : undefined,
          after: { durum },
        });
      },
      `Beyanname durumu "${durum}" olarak güncellendi`
    );
  };

  const handleTahsilatDurum = (id: string, durum: TahsilatDurum) => {
    const hedef = localTahsilatlar.find((t) => t.id === id);
    const patch: Partial<Tahsilat> = {
      durum,
      odemeTarihi: durum === "odendi" || durum === "kismi" ? new Date().toISOString() : undefined,
      odenenTutar: durum === "odendi" ? hedef?.tutar : hedef?.odenenTutar,
    };

    setLocalTahsilatlar((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );

    runFirebaseAction(
      async () => {
        await updateTahsilatDurum(id, durum);
        await logAudit({
          action: "status_change",
          entityType: "tahsilat",
          entityId: id,
          entityLabel: hedef ? `${hedef.musteriAdi} - ${hedef.donem}` : undefined,
          summary: `Tahsilat durumu ${durum} olarak güncellendi`,
          before: hedef ? { durum: hedef.durum, odenenTutar: hedef.odenenTutar } : undefined,
          after: patch as Record<string, unknown>,
        });
      },
      `Tahsilat durumu "${durum}" olarak güncellendi`
    );
  };

  const handleMusteriPasifeAl = () => {
    runFirebaseAction(
      async () => {
        await archiveMusteri(musteri.id);
        await logAudit({
          action: "status_change",
          entityType: "musteri",
          entityId: musteri.id,
          entityLabel: musteri.firmaAdi,
          summary: "Müşteri pasife alındı",
          before: { durum: musteri.durum },
          after: { durum: "pasif" },
        });
      },
      "Müşteri pasife alındı"
    );
  };

  const applyGorevPatch = (id: string, patch: Partial<Gorev>) => {
    setLocalGorevler((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );
    setSeciliGorev((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  const handleGorevDurum = async (id: string, durum: Gorev["durum"]) => {
    const gorev = localGorevler.find((g) => g.id === id);
    applyGorevPatch(id, {
      durum,
      tamamlanmaTarihi: durum === "tamamlandi" ? new Date().toISOString() : undefined,
    });

    if (!isFirebaseConfigured) return;
    await updateGorevDurum(id, durum);
    await logAudit({
      action: "status_change",
      entityType: "gorev",
      entityId: id,
      entityLabel: gorev?.baslik,
      summary: `Görev durumu ${durum} olarak güncellendi`,
      before: gorev ? { durum: gorev.durum } : undefined,
      after: { durum },
    });
  };

  const handleGorevGuncelle = async (id: string, patch: Partial<Gorev>) => {
    const gorev = localGorevler.find((g) => g.id === id);
    applyGorevPatch(id, patch);

    if (!isFirebaseConfigured) return;
    await updateGorev(id, patch);
    await logAudit({
      action: "update",
      entityType: "gorev",
      entityId: id,
      entityLabel: gorev?.baslik,
      summary: "Görev bilgileri güncellendi",
      after: patch as Record<string, unknown>,
    });
  };

  const handleGorevNotEkle = async (id: string, yeniNot: GorevNot) => {
    const hedefGorev = localGorevler.find((g) => g.id === id);
    const notlar = [...normalizeGorevNotlar(hedefGorev?.notlar), yeniNot];

    applyGorevPatch(id, { notlar });

    if (!isFirebaseConfigured) return;
    await updateGorev(id, { notlar });
    await logAudit({
      action: "update",
      entityType: "gorev",
      entityId: id,
      entityLabel: hedefGorev?.baslik,
      summary: "Göreve not eklendi",
      after: { notSayisi: notlar.length },
    });
  };

  const handleGorevNotSil = async (id: string, notId: string) => {
    const hedef = localGorevler.find((g) => g.id === id);
    const guncelNotlar = normalizeGorevNotlar(hedef?.notlar).filter((n) => n.id !== notId);
    applyGorevPatch(id, { notlar: guncelNotlar });
    if (!isFirebaseConfigured) return;
    await updateGorev(id, { notlar: guncelNotlar });
  };

  const handleGorevSil = async (id: string) => {
    const gorev = localGorevler.find((g) => g.id === id);
    setLocalGorevler((prev) => prev.filter((g) => g.id !== id));
    setSeciliGorev(null);

    if (!isFirebaseConfigured) return;
    await deleteGorev(id);
    await logAudit({
      action: "delete",
      entityType: "gorev",
      entityId: id,
      entityLabel: gorev?.baslik,
      summary: "Görev silindi",
      before: gorev as unknown as Record<string, unknown>,
    });
  };

  const handleTahsilatSaved = (kayit: Tahsilat) => {
    setLocalTahsilatlar((prev) => {
      const exists = prev.some((t) => t.id === kayit.id);
      return exists
        ? prev.map((t) => (t.id === kayit.id ? kayit : t))
        : [kayit, ...prev];
    });
    setSeciliTahsilat(null);
  };

  const handleBelgeUploaded = (belge: Belge) => {
    setLocalBelgeler((prev) => {
      const exists = prev.some((b) => b.id === belge.id);
      return exists
        ? prev.map((b) => (b.id === belge.id ? belge : b))
        : [belge, ...prev];
    });
  };

  const handleBelgeSil = async (belge: Belge) => {
    if (!window.confirm("Bu belge silinsin mi?")) return;

    setLocalBelgeler((prev) => prev.filter((b) => b.id !== belge.id));

    if (!isFirebaseConfigured) return;

    try {
      await deleteBelge(belge.id);
      if (belge.storagePath) await deleteStorageFile(belge.storagePath);
      await logAudit({
        action: "delete",
        entityType: "belge",
        entityId: belge.id,
        entityLabel: belge.dosyaAdi,
        summary: "Belge silindi",
        before: belge as unknown as Record<string, unknown>,
      });
      toast.success("Belge silindi");
    } catch (error) {
      console.error(error);
      toast.error("Belge silinemedi", parseFirestoreError(error));
    }
  };

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
            <TahsilatBadge durum={musteri.tahsilatDurumu} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={() => setShowDavetModal(true)}
          >
            {aktifDavet ? "Daveti Göster" : "Portal Daveti"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<CreditCard className="w-3.5 h-3.5" />}
            onClick={() => setShowTahakkukModal(true)}
          >
            Tahakkuk
          </Button>
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
          {canAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={<Edit className="w-3.5 h-3.5" />}
              onClick={() => setShowMusteriModal(true)}
            >
              Düzenle
            </Button>
          )}
          {canAdmin && (
            <Button
              variant="outline"
              size="sm"
              icon={<MoreHorizontal className="w-3.5 h-3.5" />}
              onClick={handleMusteriPasifeAl}
            >
              Pasife Al
            </Button>
          )}
        </div>
      </div>

      {/* Üst bilgi kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="!p-4">
          <p className="text-xs text-slate-500 mb-1">Yaklaşan Sorumluluk</p>
          {enYakinSorumluluk ? (
            <>
              <p className="text-lg font-bold text-slate-900 mt-1">{formatTarih(enYakinSorumluluk.tarih)}</p>
              <p className="text-xs text-slate-500 mt-1 truncate">{enYakinSorumluluk.etiket}</p>
            </>
          ) : (
            <p className="text-sm font-medium text-emerald-600 mt-2">Sorumluluk yok</p>
          )}
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

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Tahakkuk ve Ödeme Özeti</h3>
                <Button size="sm" variant="outline" onClick={() => setShowTahakkukModal(true)}>
                  Tahakkuk Ekle
                </Button>
              </div>
              {tahakkuklar.length === 0 ? (
                <p className="text-xs text-slate-400">Tahakkuk kaydı bulunamadı</p>
              ) : (
                <div className="space-y-2">
                  {tahakkuklar.slice(0, 4).map((tahakkuk) => (
                    <div key={tahakkuk.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{tahakkuk.donem}</p>
                          <p className="text-xs text-slate-500">{tahakkukKalemLabel(tahakkuk)}</p>
                          {tahakkuk.otomatikTuretilmis && (
                            <p className="text-[11px] text-blue-500">Beyannameden otomatik türetildi</p>
                          )}
                        </div>
                        <TahsilatBadge
                          durum={
                            tahakkuk.durum === "odendi"
                              ? "odendi"
                              : tahakkuk.durum === "kismi"
                                ? "kismi"
                                : tahakkuk.durum === "gecikti"
                                  ? "gecikti"
                                  : "bekliyor"
                          }
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Tutar: {formatPara(tahakkuk.tutar)}</span>
                        <span className="text-slate-500">Ödenen: {formatPara(tahakkuk.odenenTutar ?? 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {odemeler.length > 0 && (
                <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800">Son banka eşleşmesi</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {formatPara(odemeler[0].tutar)} · {formatTarih(odemeler[0].odemeTarihi)} · {odemeler[0].durum}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            {/* Yaklaşan sorumluluklar */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-800">Yaklaşan Sorumluluklar</h3>
              </div>
              {yaklasanSorumluluklar.length === 0 ? (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-600 text-xs font-medium">✓ Yaklaşan sorumluluk yok</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {yaklasanSorumluluklar.map((item, i) => {
                    const Icon = item.tur === "beyanname" ? FileText : item.tur === "gorev" ? CheckSquare : CreditCard;
                    const renk = item.tur === "beyanname" ? "bg-red-50 text-red-700" : item.tur === "gorev" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${renk}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{item.etiket}</p>
                          <p className="text-[10px] text-slate-500">{formatTarih(item.tarih)}</p>
                        </div>
                      </div>
                    );
                  })}
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

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Zaman Çizelgesi</h3>
                {aktifDavet && <Badge variant="info">Portal daveti bekliyor</Badge>}
              </div>
              {musteriAudit.length === 0 ? (
                <p className="text-xs text-slate-400">Zaman çizelgesi kaydı bulunamadı</p>
              ) : (
                <div className="space-y-3">
                  {musteriAudit.map((log) => (
                    <div key={log.id} className="relative pl-4">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                      <p className="text-xs font-medium text-slate-800">{log.summary}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatTarih(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
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
                <TableHeadCell>İşlem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {gorevler.length === 0 ? (
                <TableEmpty colSpan={8} />
              ) : (
                gorevler.map((g) => (
                  <TableRow key={g.id} onClick={() => setSeciliGorev(g)} className="cursor-pointer">
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

      {activeTab === "Belgeler" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Belgeler</h3>
              <p className="text-xs text-slate-500 mt-0.5">Müşteri dosyaları ve paylaşılan evraklar</p>
            </div>
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowBelgeModal(true)}
            >
              Belge Yükle
            </Button>
          </div>
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Dosya</TableHeadCell>
                <TableHeadCell>Kategori</TableHeadCell>
                <TableHeadCell>Boyut</TableHeadCell>
                <TableHeadCell>Yükleyen</TableHeadCell>
                <TableHeadCell>Tarih</TableHeadCell>
                <TableHeadCell>Görünürlük</TableHeadCell>
                <TableHeadCell>İşlem</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {belgeler.length === 0 ? (
                <TableEmpty colSpan={7} message="Henüz belge yüklenmedi" />
              ) : (
                belgeler.map((belge) => (
                  <TableRow key={belge.id}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{belge.dosyaAdi}</p>
                        {belge.notlar && <p className="text-xs text-slate-400 mt-0.5">{belge.notlar}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="neutral">{belge.kategori}</Badge></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{formatDosyaBoyutu(belge.boyut)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{belge.yukleyen}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{formatTarih(belge.createdAt)}</span></TableCell>
                    <TableCell>
                      <Badge variant={belge.gorunurluk === "mukellef" ? "success" : "neutral"}>
                        {belge.gorunurluk === "mukellef" ? "Mükellef" : "Ofis"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <a
                          href={belge.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Aç"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleBelgeSil(belge)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
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

      {activeTab === "Yükümlülükler" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <Table>
            <TableHead>
              <tr>
                <TableHeadCell>Tip</TableHeadCell>
                <TableHeadCell>Dönem</TableHeadCell>
                <TableHeadCell>Son Tarih</TableHeadCell>
                <TableHeadCell>Sorumlu</TableHeadCell>
                <TableHeadCell>Durum</TableHeadCell>
                <TableHeadCell>Açıklama</TableHeadCell>
              </tr>
            </TableHead>
            <TableBody>
              {yukumlulukler.length === 0 ? (
                <TableEmpty colSpan={6} message="Yükümlülük kaydı bulunamadı" />
              ) : (
                yukumlulukler.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Badge variant="neutral">{yukumlulukTipLabel(item.tip)}</Badge></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{item.donem}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-700">{formatTarih(item.sonTarih)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{item.sorumlu}</span></TableCell>
                    <TableCell><Badge variant={yukumlulukVariant(item.durum)}>{item.durum}</Badge></TableCell>
                    <TableCell className="whitespace-normal">
                      <span className="text-xs text-slate-500">{item.aciklama ?? "-"}</span>
                    </TableCell>
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
                <TableEmpty colSpan={8} />
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {b.durum !== "verildi" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleBeyanDurum(b.id, "verildi")}>
                            Verildi
                          </Button>
                        )}
                        {b.durum !== "gecikti" && (
                          <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => handleBeyanDurum(b.id, "gecikti")}>
                            Gecikti
                          </Button>
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
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setSeciliTahsilat(null);
                setShowTahsilatModal(true);
              }}
            >
              Tahsilat Ekle
            </Button>
          </div>
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
                <TableHeadCell>İşlem</TableHeadCell>
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            setSeciliTahsilat(t);
                            setShowTahsilatModal(true);
                          }}
                        >
                          Ödeme Kaydet
                        </Button>
                        {t.durum !== "odendi" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleTahsilatDurum(t.id, "odendi")}>
                            Ödendi
                          </Button>
                        )}
                        {t.durum !== "kismi" && (
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleTahsilatDurum(t.id, "kismi")}>
                            Kısmi
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      )}

      {activeTab === "Tahakkuk" && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowTahakkukModal(true)}
            >
              Tahakkuk Ekle
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <Table>
              <TableHead>
                <tr>
                  <TableHeadCell>Dönem</TableHeadCell>
                  <TableHeadCell>Kalem</TableHeadCell>
                  <TableHeadCell>Tutar</TableHeadCell>
                  <TableHeadCell>Ödenen</TableHeadCell>
                  <TableHeadCell>Vade</TableHeadCell>
                  <TableHeadCell>Durum</TableHeadCell>
                  <TableHeadCell>Bildirim</TableHeadCell>
                </tr>
              </TableHead>
              <TableBody>
                {tahakkuklar.length === 0 ? (
                  <TableEmpty colSpan={7} message="Tahakkuk bulunamadı" />
                ) : (
                  tahakkuklar.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><span className="text-xs text-slate-600">{item.donem}</span></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={item.tahakkukTuru === "vergi" ? "warning" : "neutral"}>
                            {tahakkukTuruLabel(item.tahakkukTuru)}
                          </Badge>
                          <span className="text-[11px] text-slate-500">{tahakkukKalemLabel(item)}</span>
                          {item.otomatikTuretilmis && (
                            <span className="text-[11px] text-blue-500">Beyannameden otomatik türetildi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><span className="text-xs font-semibold text-slate-800">{formatPara(item.tutar)}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-600">{formatPara(item.odenenTutar ?? 0)}</span></TableCell>
                      <TableCell><span className="text-xs text-slate-600">{formatTarih(item.vadeTarihi)}</span></TableCell>
                      <TableCell>
                        <TahsilatBadge
                          durum={
                            item.durum === "odendi"
                              ? "odendi"
                              : item.durum === "kismi"
                                ? "kismi"
                                : item.durum === "gecikti"
                                  ? "gecikti"
                                  : "bekliyor"
                          }
                        />
                      </TableCell>
                      <TableCell><Badge variant="info">{item.bildirimDurumu}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modaller */}
      <YeniGorevModal
        open={showGorevModal}
        onClose={() => setShowGorevModal(false)}
        musteriId={musteri.id}
        onCreated={(gorev) => {
          if (source !== "firebase") setLocalGorevler((prev) => [gorev, ...prev]);
        }}
        onSuccess={() => toast.success("Görev oluşturuldu")}
      />
      <YeniMusteriModal
        open={showMusteriModal}
        onClose={() => setShowMusteriModal(false)}
        musteri={musteri}
        kullanicilar={kullanicilar}
      />
      <WhatsAppGonderimModal
        open={showWaModal}
        onClose={() => setShowWaModal(false)}
        musteriId={musteri.id}
      />
      <GorevDetayDrawer
        gorev={seciliGorev}
        onClose={() => setSeciliGorev(null)}
        onDurumGuncelle={handleGorevDurum}
        onNotEkle={handleGorevNotEkle}
        onNotSil={handleGorevNotSil}
        onGorevGuncelle={handleGorevGuncelle}
        onGorevSil={handleGorevSil}
      />
      <TahsilatModal
        open={showTahsilatModal}
        onClose={() => {
          setShowTahsilatModal(false);
          setSeciliTahsilat(null);
        }}
        musteriId={musteri.id}
        tahsilat={seciliTahsilat}
        onSaved={handleTahsilatSaved}
      />
      <BelgeUploadModal
        open={showBelgeModal}
        onClose={() => setShowBelgeModal(false)}
        musteriId={musteri.id}
        onUploaded={handleBelgeUploaded}
      />
      <DavetModal
        open={showDavetModal}
        onClose={() => setShowDavetModal(false)}
        defaultRole="mukellef"
        musteriId={musteri.id}
        musteriAdi={musteri.firmaAdi}
        defaultEmail={musteri.email}
      />
      <TahakkukModal
        open={showTahakkukModal}
        onClose={() => setShowTahakkukModal(false)}
        musteriId={musteri.id}
        defaultTahakkukTuru="hizmet"
        onSaved={(item) => setLocalTahakkuklar((prev) => [item, ...prev])}
      />
    </div>
  );
}
