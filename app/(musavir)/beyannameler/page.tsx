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
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAppData } from "@/lib/hooks/useAppData";
import { PageLoading } from "@/components/ui/PageLoading";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { updateBeyannameWorkflow } from "@/lib/firebase/repositories";
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
  const logAudit = useAuditLog();
  const { beyannameler: loadedBeyanlar, musteriler, loading } = useAppData();

  const [beyanlar, setBeyanlar] = useState<Beyanname[]>(loadedBeyanlar);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTur, setFilterTur] = useState("tumu");
  const [filterDurum, setFilterDurum] = useState("tumu");
  const [filterSorumlu, setFilterSorumlu] = useState("tumu");
  const [workflowLoading, setWorkflowLoading] = useState<string | null>(null);
  const [onayBekleyen, setOnayBekleyen] = useState<Beyanname | null>(null);
  const [onayTip, setOnayTip] = useState<"gonder" | "duzelt" | null>(null);

  useEffect(() => {
    setBeyanlar(loadedBeyanlar);
  }, [loadedBeyanlar]);

  if (loading) return <PageLoading />;

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
      toast.error("Durum güncellenemedi", err instanceof Error ? err.message : undefined);
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
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowModal(true)}
          >
            Yeni Beyanname
          </Button>
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
    </div>
  );
}
