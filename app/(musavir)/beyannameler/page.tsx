"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Shield,
  RefreshCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, BeyannameBadge } from "@/components/ui/Badge";
import { StatsDrawer } from "@/components/layout/StatsDrawer";
import { MobileCard, MobileField, MobileList } from "@/components/ui/MobileList";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/Table";
import { Input, Select } from "@/components/ui/Input";
import { YeniBeyanameModal } from "@/components/modals/YeniBeyanameModal";
import { UcOnayModal, type UcOnayAdim } from "@/components/modals/UcOnayModal";
import { useToast } from "@/lib/context/ToastContext";
import { useAuth } from "@/lib/context/AuthContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { authHeaders, isFirebaseConfigured } from "@/lib/firebase/client";
import { parseFirestoreError } from "@/lib/utils/firebaseErrors";
import { updateBeyannameWorkflow, upsertBeyannameFromGib } from "@/lib/firebase/repositories";
import {
  beyanWorkflowLabel,
  beyanWorkflowVariant,
  nextWorkflowStep,
  workflowActionLabel,
  buildBeyanWorkflowPatch,
} from "@/lib/domain/beyanWorkflow";
import { formatTarih, formatPara } from "@/lib/utils/format";
import type { Beyanname, BeyannameType } from "@/lib/types";

const BEYAN_TUR_LABELS: Record<BeyannameType, string> = {
  KDV: "KDV",
  MUHTAS: "Muhtasar",
  KURUM: "Kurumlar",
  GELIR: "Gelir",
  GECICI: "Geçici",
  DIGER: "Diğer",
};

function sonTarihUyari(sonTarih: string): "gecikti" | "yaklasan" | "normal" {
  const now = new Date();
  const dt = new Date(sonTarih);
  if (isNaN(dt.getTime())) return "normal";
  const diffGun = Math.ceil((dt.getTime() - now.getTime()) / 86_400_000);
  if (diffGun < 0) return "gecikti";
  if (diffGun <= 7) return "yaklasan";
  return "normal";
}

export default function BeyannamellerPage() {
  const toast = useToast();
  const { user } = useAuth();
  const logAudit = useAuditLog();
  const { beyannameler: loadedBeyanlar, musteriler, gibEntegrasyonAyarlari, loading } = useAppData();

  const [beyanlar, setBeyanlar] = useState<Beyanname[]>(loadedBeyanlar);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTur, setFilterTur] = useState("tumu");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [filterSorumlu, setFilterSorumlu] = useState("tumu");
  const [workflowLoading, setWorkflowLoading] = useState<string | null>(null);
  const [onayBekleyen, setOnayBekleyen] = useState<Beyanname | null>(null);
  const [onayTip, setOnayTip] = useState<"gonder" | "duzelt" | null>(null);

  // GİB sync state
  const [captchaModal, setCaptchaModal] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaImageBase64, setCaptchaImageBase64] = useState("");
  const [captchaImageID, setCaptchaImageID] = useState("");
  const [captchaDk, setCaptchaDk] = useState("");
  const [gibSyncLoading, setGibSyncLoading] = useState(false);
  const [gibSyncProgress, setGibSyncProgress] = useState("");

  useEffect(() => {
    setBeyanlar(loadedBeyanlar);
  }, [loadedBeyanlar]);

  if (loading) return <PageLoading />;

  /* ── GİB Beyanname Sync ── */
  const handleGibSync = async () => {
    setCaptchaDk("");
    setCaptchaImageBase64("");
    setCaptchaImageID("");
    setCaptchaLoading(true);
    setCaptchaModal(true);
    try {
      const res = await fetch("/api/gib/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Captcha alınamadı");
      setCaptchaImageBase64(data.imageBase64);
      setCaptchaImageID(data.imageID);
    } catch (err) {
      toast.error("GİB captcha alınamadı", err instanceof Error ? err.message : undefined);
      setCaptchaModal(false);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleRefreshCaptcha = async () => {
    setCaptchaDk("");
    setCaptchaImageBase64("");
    setCaptchaImageID("");
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/gib/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Captcha alınamadı");
      setCaptchaImageBase64(data.imageBase64);
      setCaptchaImageID(data.imageID);
    } catch (err) {
      toast.error("GİB captcha alınamadı", err instanceof Error ? err.message : undefined);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const executeGibSync = async () => {
    setCaptchaModal(false);
    setGibSyncLoading(true);

    const ofisId = gibEntegrasyonAyarlari[0]?.ofisId ?? user?.ofisId ?? "";
    const aktifMusteriler = musteriler.filter((m) => m.durum === "aktif" && m.vknTckn);

    if (aktifMusteriler.length === 0) {
      toast.warning("Aktif müşteri bulunamadı", "Beyanname çekmek için VKN'li aktif müşteri gerekli");
      setGibSyncLoading(false);
      return;
    }

    let toplamKayit = 0;
    let hataSayisi = 0;

    for (let i = 0; i < aktifMusteriler.length; i++) {
      const musteri = aktifMusteriler[i];
      setGibSyncProgress(`${musteri.firmaAdi} (${i + 1}/${aktifMusteriler.length})`);

      try {
        const res = await fetch("/api/gib/sync", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({
            ofisId,
            syncTipi: "beyanname",
            musteriVkn: musteri.vknTckn,
            captchaDk,
            captchaImageID,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.warn(`[GİB Beyanname] ${musteri.firmaAdi}:`, data.error);
          hataSayisi++;
          continue;
        }
        const beyannameler = (data.beyannameler ?? []).map((b: Record<string, unknown>) => ({
          ...b,
          ofisId,
          musteriId: musteri.id,
          musteriAdi: musteri.firmaAdi,
        }));
        toplamKayit += beyannameler.length;
        type BeyInput = Parameters<typeof upsertBeyannameFromGib>[0];
        await Promise.all((beyannameler as BeyInput[]).map((b) => upsertBeyannameFromGib(b)));
      } catch (err) {
        console.warn(`[GİB Beyanname] ${musteri.firmaAdi}:`, err);
        hataSayisi++;
      }
    }

    setGibSyncLoading(false);
    setGibSyncProgress("");

    if (hataSayisi === 0) {
      toast.success("GİB sync tamamlandı", `${toplamKayit} beyanname Firestore'a yazıldı`);
    } else if (toplamKayit > 0) {
      toast.warning("Kısmi sync", `${toplamKayit} kayıt güncellendi, ${hataSayisi} müşteride hata`);
    } else {
      toast.error("GİB sync başarısız", "Captcha hatalı ya da env kimlik bilgileri eksik");
    }
  };

  const handleCaptchaConfirm = async () => {
    if (!captchaDk.trim()) return;
    await executeGibSync();
  };

  const gonderAdimlar: [UcOnayAdim, UcOnayAdim, UcOnayAdim] = [
    {
      ikon: Shield,
      renk: "blue",
      baslik: "Beyanname gönderilmek üzere",
      aciklama: onayBekleyen
        ? `${onayBekleyen.musteriAdi} — ${onayBekleyen.tur} ${onayBekleyen.donem} beyannamesi GİB'e gönderildi olarak işaretlenecek. IVD kimlik bilgileriniz kullanılarak kayıt yapılacak.`
        : "",
      onayMetni: "Anladım, devam et",
    },
    {
      ikon: AlertTriangle,
      renk: "amber",
      baslik: "Bu işlem geri alınamaz",
      aciklama:
        "Beyanname 'Gönderildi' olarak işaretlendikten sonra otomatik tahakkuk oluşturulacak. Hatalı gönderim durumunda 'Düzeltme Gerekli' akışını kullanmanız gerekecek.",
      onayMetni: "Riskleri anladım, onayla",
    },
    {
      ikon: CheckCircle2,
      renk: "green",
      baslik: "Son onay",
      aciklama: onayBekleyen
        ? `${onayBekleyen.musteriAdi} — ${onayBekleyen.tur} ${onayBekleyen.donem} beyannamesini GİB'e gönderildi olarak kesinleştiriyorsunuz.`
        : "",
      onayMetni: "Evet, gönder",
    },
  ];

  const duzeltAdimlar: [UcOnayAdim, UcOnayAdim, UcOnayAdim] = [
    {
      ikon: RotateCcw,
      renk: "amber",
      baslik: "Düzeltme süreci başlatılıyor",
      aciklama: onayBekleyen
        ? `${onayBekleyen.musteriAdi} — ${onayBekleyen.tur} ${onayBekleyen.donem} beyannamesi "Düzeltme Gerekli" durumuna alınacak. Beyanname yeniden hazırlanması gerekecek.`
        : "",
      onayMetni: "Devam et",
    },
    {
      ikon: AlertTriangle,
      renk: "red",
      baslik: "Müşteri bilgilendirilmeli",
      aciklama:
        "Düzeltme beyannamesi gönderilmeden önce müşteri ile iletişime geçilmesi ve eksik/hatalı evrakların temin edilmesi gerekmektedir.",
      onayMetni: "Anladım",
    },
    {
      ikon: CheckCircle2,
      renk: "green",
      baslik: "Son onay",
      aciklama: onayBekleyen
        ? `${onayBekleyen.musteriAdi} — ${onayBekleyen.tur} ${onayBekleyen.donem} beyannamesini düzeltme sürecine almak istediğinizi onaylayın.`
        : "",
      onayMetni: "Evet, düzeltmeye al",
    },
  ];

  /* ── filtre ── */
  const sorumlular = Array.from(new Set(beyanlar.map((b) => b.sorumlu).filter(Boolean)));

  const filtered = beyanlar.filter((b) => {
    if (filterTur !== "tumu" && b.tur !== filterTur) return false;
    if (filterDurum !== "tumu" && b.durum !== filterDurum) return false;
    if (filterSorumlu !== "tumu" && b.sorumlu !== filterSorumlu) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.musteriAdi.toLowerCase().includes(q) && !b.donem.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* ── stats ── */
  const verildi = beyanlar.filter((b) => b.durum === "verildi").length;
  const bekliyor = beyanlar.filter((b) => b.durum === "bekliyor").length;
  const gecikti = beyanlar.filter((b) => b.durum === "gecikti").length;

  const metrics = [
    { title: "Toplam", value: beyanlar.length, subtitle: "Kayıtlı beyanname", icon: <FileText className="w-5 h-5" />, variant: "default" as const },
    { title: "Verildi", value: verildi, subtitle: "Tamamlandı", icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, variant: "default" as const },
    { title: "Bekliyor", value: bekliyor, subtitle: "İşlem gerekiyor", icon: <Clock className="w-5 h-5 text-blue-500" />, variant: bekliyor > 0 ? "warning" as const : "default" as const },
    { title: "Gecikti", value: gecikti, subtitle: "Acil müdahale", icon: <AlertTriangle className="w-5 h-5 text-red-500" />, variant: gecikti > 0 ? "danger" as const : "default" as const },
  ];

  /* ── workflow adımını uygula (onay sonrası çağrılır) ── */
  const applyWorkflowIleri = async (beyanname: Beyanname) => {
    const next = nextWorkflowStep(beyanname.yasamDongusuDurum);
    if (!next) return;
    setWorkflowLoading(beyanname.id);
    try {
      const patch = buildBeyanWorkflowPatch(beyanname, next);
      if (isFirebaseConfigured) {
        await updateBeyannameWorkflow(beyanname.id, next, patch);
      }
      setBeyanlar((prev) =>
        prev.map((b) => (b.id === beyanname.id ? { ...b, ...patch } : b))
      );
      await logAudit({
        action: "status_change",
        entityType: "beyanname",
        entityId: beyanname.id,
        entityLabel: `${beyanname.musteriAdi} — ${beyanname.tur} ${beyanname.donem}`,
        summary: `Durum: ${beyanWorkflowLabel(beyanname.yasamDongusuDurum)} → ${beyanWorkflowLabel(next)}`,
        before: { yasamDongusuDurum: beyanname.yasamDongusuDurum },
        after: { yasamDongusuDurum: next },
      });
      toast.success(`${beyanWorkflowLabel(next)}`, `${beyanname.musteriAdi} — ${beyanname.tur}`);
    } catch (err) {
      toast.error("Durum güncellenemedi", parseFirestoreError(err));
      throw err;
    } finally {
      setWorkflowLoading(null);
    }
  };

  /* ── gönderim gerektiren adımlar için 3 onay, diğerleri direkt ── */
  const handleWorkflowIleri = (beyanname: Beyanname) => {
    const next = nextWorkflowStep(beyanname.yasamDongusuDurum);
    if (!next) return;
    if (next === "gonderildi") {
      setOnayBekleyen(beyanname);
      setOnayTip("gonder");
    } else {
      applyWorkflowIleri(beyanname);
    }
  };

  const applyGeriAl = async (beyanname: Beyanname) => {
    if (isFirebaseConfigured) {
      await updateBeyannameWorkflow(beyanname.id, "duzeltme_gerekli");
    }
    setBeyanlar((prev) =>
      prev.map((b) =>
        b.id === beyanname.id
          ? { ...b, yasamDongusuDurum: "duzeltme_gerekli", durum: "gecikti" }
          : b
      )
    );
    toast.warning("Düzeltme gerekli", beyanname.musteriAdi);
  };

  const handleGeriAl = (beyanname: Beyanname) => {
    setOnayBekleyen(beyanname);
    setOnayTip("duzelt");
  };

  return (
    <div>
      <PageHeader
        title="Beyannameler"
        subtitle="Tüm beyannameleri takip edin, iş akışını yönetin"
        action={
          <div className="flex items-center gap-2">
            {gibSyncLoading && gibSyncProgress && (
              <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[160px]">
                {gibSyncProgress}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${gibSyncLoading ? "animate-spin" : ""}`} />}
              loading={gibSyncLoading}
              onClick={handleGibSync}
              title="GİB IVD'den beyannameleri çek"
            >
              GİB Getir
            </Button>
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowModal(true)}
            >
              Yeni Beyanname
            </Button>
          </div>
        }
      />

      <StatsDrawer
        title="Beyanname Özeti"
        subtitle="Durum dağılımı"
        metrics={metrics}
      />

      {/* Filtreler */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input
          placeholder="Müşteri veya dönem ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filterTur} onChange={(e) => setFilterTur(e.target.value)}>
          <option value="tumu">Tüm Türler</option>
          {Object.entries(BEYAN_TUR_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select value={filterDurum} onChange={(e) => setFilterDurum(e.target.value)}>
          <option value="tumu">Tüm Durumlar</option>
          <option value="bekliyor">Bekliyor</option>
          <option value="verildi">Verildi</option>
          <option value="gecikti">Gecikti</option>
          <option value="iptal">İptal</option>
        </Select>
        <Select value={filterSorumlu} onChange={(e) => setFilterSorumlu(e.target.value)}>
          <option value="tumu">Tüm Sorumlular</option>
          {sorumlular.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {/* Mobil liste */}
      <MobileList className="md:hidden" empty={filtered.length === 0}>
        {filtered.map((b) => {
          const uyari = sonTarihUyari(b.sonTarih);
          const nextStep = nextWorkflowStep(b.yasamDongusuDurum);
          const actionLabel = workflowActionLabel(b.yasamDongusuDurum);
          return (
            <MobileCard key={b.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/musteriler/${b.musteriId}`}
                    className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                  >
                    {b.musteriAdi}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="info">{BEYAN_TUR_LABELS[b.tur]}</Badge>
                    <Badge variant="neutral">{b.donem}</Badge>
                  </div>
                </div>
                <BeyannameBadge durum={b.durum} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MobileField label="Son Tarih">
                  <span
                    className={
                      uyari === "gecikti"
                        ? "font-semibold text-red-600"
                        : uyari === "yaklasan"
                        ? "font-semibold text-amber-600"
                        : "text-slate-700"
                    }
                  >
                    {formatTarih(b.sonTarih)}
                  </span>
                </MobileField>
                <MobileField label="Sorumlu">{b.sorumlu || "—"}</MobileField>
                <MobileField label="Aşama" className="col-span-2">
                  <Badge variant={beyanWorkflowVariant(b.yasamDongusuDurum)}>
                    {beyanWorkflowLabel(b.yasamDongusuDurum)}
                  </Badge>
                </MobileField>
              </div>
              {nextStep && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ChevronRight className="w-3 h-3" />}
                    loading={workflowLoading === b.id}
                    onClick={() => handleWorkflowIleri(b)}
                  >
                    {actionLabel}
                  </Button>
                  {b.yasamDongusuDurum !== "duzeltme_gerekli" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleGeriAl(b)}
                    >
                      Düzeltme
                    </Button>
                  )}
                </div>
              )}
            </MobileCard>
          );
        })}
      </MobileList>

      {/* Masaüstü tablo */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>Tür</TableHeadCell>
              <TableHeadCell>Dönem</TableHeadCell>
              <TableHeadCell>Son Tarih</TableHeadCell>
              <TableHeadCell>Vergi</TableHeadCell>
              <TableHeadCell>Sorumlu</TableHeadCell>
              <TableHeadCell>Aşama</TableHeadCell>
              <TableHeadCell>Durum</TableHeadCell>
              <TableHeadCell>İşlem</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty colSpan={9} />
            ) : (
              filtered.map((b) => {
                const uyari = sonTarihUyari(b.sonTarih);
                const nextStep = nextWorkflowStep(b.yasamDongusuDurum);
                const actionLabel = workflowActionLabel(b.yasamDongusuDurum);
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link
                        href={`/musteriler/${b.musteriId}`}
                        className="group flex items-center gap-1 text-xs font-medium text-slate-800 hover:text-blue-600"
                      >
                        {b.musteriAdi}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{BEYAN_TUR_LABELS[b.tur]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{b.donem}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={[
                          "text-xs font-medium",
                          uyari === "gecikti"
                            ? "text-red-600"
                            : uyari === "yaklasan"
                            ? "text-amber-600"
                            : "text-slate-700",
                        ].join(" ")}
                      >
                        {uyari === "gecikti" && (
                          <AlertTriangle className="inline w-3 h-3 mr-1" />
                        )}
                        {formatTarih(b.sonTarih)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {b.vergiTutari ? formatPara(b.vergiTutari) : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">{b.sorumlu || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={beyanWorkflowVariant(b.yasamDongusuDurum)}>
                        {beyanWorkflowLabel(b.yasamDongusuDurum)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <BeyannameBadge durum={b.durum} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {nextStep && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={workflowLoading === b.id}
                            onClick={() => handleWorkflowIleri(b)}
                            title={`İleri: ${actionLabel}`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {b.yasamDongusuDurum !== "duzeltme_gerekli" &&
                          b.yasamDongusuDurum !== "kapandi" &&
                          b.yasamDongusuDurum !== "iptal" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleGeriAl(b)}
                            title="Düzeltme gerekli"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <YeniBeyanameModal
        open={showModal}
        onClose={() => setShowModal(false)}
        musteriler={musteriler.filter((m) => m.durum === "aktif")}
        onCreated={(created) => setBeyanlar((prev) => [created, ...prev])}
      />

      {onayBekleyen && onayTip === "gonder" && (
        <UcOnayModal
          open={true}
          baslik="Beyanname Gönderimi — 3 Onay Gerekli"
          adimlar={gonderAdimlar}
          onClose={() => { setOnayBekleyen(null); setOnayTip(null); }}
          onConfirm={async () => {
            await applyWorkflowIleri(onayBekleyen);
            setOnayBekleyen(null);
            setOnayTip(null);
          }}
        />
      )}

      {onayBekleyen && onayTip === "duzelt" && (
        <UcOnayModal
          open={true}
          baslik="Düzeltme Süreci — 3 Onay Gerekli"
          adimlar={duzeltAdimlar}
          onClose={() => { setOnayBekleyen(null); setOnayTip(null); }}
          onConfirm={async () => {
            await applyGeriAl(onayBekleyen);
            setOnayBekleyen(null);
            setOnayTip(null);
          }}
        />
      )}

      {/* ─── GİB Captcha Modal ─────────────────────────────────────────── */}
      {captchaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">GİB Güvenlik Doğrulaması</h2>
                <p className="text-xs text-slate-500 mt-0.5">Beyannameleri çekmek için kodu girin</p>
              </div>
              <button
                onClick={() => setCaptchaModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Captcha görseli */}
            <div className="flex flex-col items-center gap-3">
              {captchaLoading ? (
                <div className="w-48 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : captchaImageBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${captchaImageBase64}`}
                  alt="GİB güvenlik kodu"
                  className="rounded-lg border border-slate-200 h-16 object-contain"
                />
              ) : (
                <div className="w-48 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                  Captcha yüklenemedi
                </div>
              )}
              <button
                type="button"
                onClick={handleRefreshCaptcha}
                disabled={captchaLoading}
                className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
              >
                Yenile
              </button>
            </div>

            {/* Kod girişi */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Güvenlik Kodu</label>
              <Input
                value={captchaDk}
                onChange={(e) => setCaptchaDk(e.target.value)}
                placeholder="Resimdeki kodu girin"
                onKeyDown={(e) => { if (e.key === "Enter") handleCaptchaConfirm(); }}
                autoFocus
              />
            </div>

            {/* Butonlar */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCaptchaModal(false)}
              >
                İptal
              </Button>
              <Button
                className="flex-1"
                disabled={!captchaDk.trim() || captchaLoading}
                onClick={handleCaptchaConfirm}
              >
                Beyanname Getir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
