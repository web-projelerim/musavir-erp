"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoading } from "@/components/ui/PageLoading";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { updateTahsilat, updateTahsilatDurum } from "@/lib/firebase/repositories";
import {
  genelBakiyeOzeti,
  kalanBakiye,
  kismiOdemeUygula,
  musteriBakiyeOzeti,
  odenenTutari,
} from "@/lib/domain/tahsilat";
import { formatPara, formatTarih, geciktiMi } from "@/lib/utils/format";
import type { Tahsilat, TahsilatDurum } from "@/lib/types";

const DURUM_LABELS: Record<TahsilatDurum, string> = {
  odendi: "Ödendi",
  bekliyor: "Bekliyor",
  kismi: "Kısmi",
  gecikti: "Gecikti",
};

const DURUM_VARIANTS: Record<TahsilatDurum, "success" | "neutral" | "warning" | "danger"> = {
  odendi: "success",
  bekliyor: "neutral",
  kismi: "warning",
  gecikti: "danger",
};

export default function TahsilatlarPage() {
  const { tahsilatlar: rawTahsilatlar, loading } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  // Lokal kopya: iyimser güncelleme için (Firestore onValue senkronu gecikebilir)
  const [override, setOverride] = useState<Record<string, Partial<Tahsilat>>>({});
  const tahsilatlar = useMemo(
    () => rawTahsilatlar.map((t) => (override[t.id] ? { ...t, ...override[t.id] } : t)),
    [rawTahsilatlar, override]
  );

  const [filterDurum, setFilterDurum] = useState<"tumu" | TahsilatDurum>("tumu");
  const [acikMusteri, setAcikMusteri] = useState<string | null>(null);
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [topluLoading, setTopluLoading] = useState(false);
  const [kismiId, setKismiId] = useState<string | null>(null);
  const [kismiTutar, setKismiTutar] = useState("");

  const ozet = useMemo(() => genelBakiyeOzeti(tahsilatlar), [tahsilatlar]);
  const bakiyeler = useMemo(() => musteriBakiyeOzeti(tahsilatlar), [tahsilatlar]);

  const filtreli = (liste: Tahsilat[]) =>
    filterDurum === "tumu" ? liste : liste.filter((t) => t.durum === filterDurum);

  const toggleSecili = (id: string) => {
    setSecili((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyLocal = (id: string, patch: Partial<Tahsilat>) =>
    setOverride((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));

  // ─── Toplu tahsilat: seçilenleri ödendi işaretle ───────────────────────────
  const handleTopluOdendi = async () => {
    const hedefler = tahsilatlar.filter((t) => secili.has(t.id) && t.durum !== "odendi");
    if (hedefler.length === 0) {
      toast.warning("Ödenmemiş kayıt seçilmedi");
      return;
    }
    setTopluLoading(true);
    let basarili = 0;
    const hatalar: string[] = [];
    for (const t of hedefler) {
      try {
        await updateTahsilatDurum(t.id, "odendi");
        applyLocal(t.id, { durum: "odendi", odemeTarihi: new Date().toISOString() });
        basarili += 1;
      } catch {
        hatalar.push(t.musteriAdi);
      }
    }
    logAudit({
      action: "update",
      entityType: "tahsilat",
      entityId: "toplu",
      entityLabel: `${basarili} kayıt`,
      summary: `Toplu tahsilat: ${basarili} kayıt ödendi işaretlendi${hatalar.length ? `, ${hatalar.length} hata` : ""}`,
    }).catch(() => undefined);
    if (hatalar.length) {
      toast.error(`${hatalar.length} kayıt güncellenemedi`, hatalar.slice(0, 3).join(", "));
    }
    if (basarili) {
      toast.success("Toplu tahsilat tamamlandı", `${basarili} kayıt ödendi olarak işaretlendi (${formatPara(hedefler.filter((h) => !hatalar.includes(h.musteriAdi)).reduce((s, h) => s + kalanBakiye(h), 0))})`);
    }
    setSecili(new Set());
    setTopluLoading(false);
  };

  // ─── Kısmi ödeme ───────────────────────────────────────────────────────────
  const handleKismiOdeme = async (t: Tahsilat) => {
    const tutar = Number(kismiTutar.replace(",", "."));
    if (!Number.isFinite(tutar) || tutar <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }
    const patch = kismiOdemeUygula(t, tutar);
    try {
      await updateTahsilat(t.id, patch);
      applyLocal(t.id, patch);
      logAudit({
        action: "update",
        entityType: "tahsilat",
        entityId: t.id,
        entityLabel: t.musteriAdi,
        summary: `Kısmi ödeme: ${formatPara(tutar)} (${patch.durum === "odendi" ? "tamamlandı" : `kalan ${formatPara(t.tutar - (patch.odenenTutar ?? 0))}`})`,
      }).catch(() => undefined);
      toast.success(
        patch.durum === "odendi" ? "Tahsilat tamamlandı" : "Kısmi ödeme kaydedildi",
        patch.durum === "odendi" ? undefined : `Kalan: ${formatPara(t.tutar - (patch.odenenTutar ?? 0))}`
      );
      setKismiId(null);
      setKismiTutar("");
    } catch (err) {
      toast.error("Ödeme kaydedilemedi", err instanceof Error ? err.message : undefined);
    }
  };

  if (loading) return <PageLoading />;

  const seciliKalanToplam = tahsilatlar
    .filter((t) => secili.has(t.id) && t.durum !== "odendi")
    .reduce((s, t) => s + kalanBakiye(t), 0);

  return (
    <div>
      <PageHeader
        title="Tahsilatlar"
        subtitle={`${bakiyeler.length} müşteri · ${tahsilatlar.length} kayıt`}
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Tahsilatlar" }]}
        action={
          secili.size > 0 ? (
            <Button
              icon={<CheckCircle2 className="w-4 h-4" />}
              loading={topluLoading}
              onClick={handleTopluOdendi}
            >
              {secili.size} Seçileni Ödendi İşaretle ({formatPara(seciliKalanToplam)})
            </Button>
          ) : undefined
        }
      />

      {/* Genel özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <MetricCard title="Toplam Alacak" value={formatPara(ozet.toplamAlacak)} subtitle={`${tahsilatlar.length} kayıt`} />
        <MetricCard title="Tahsil Edilen" value={formatPara(ozet.tahsilEdilen)} variant="success" subtitle={ozet.toplamAlacak > 0 ? `%${Math.round((ozet.tahsilEdilen / ozet.toplamAlacak) * 100)}` : "—"} />
        <MetricCard title="Kalan Bakiye" value={formatPara(ozet.kalanBakiye)} variant="warning" subtitle="Ödenmemiş toplam" />
        <MetricCard title="Geciken" value={formatPara(ozet.gecikenTutar)} variant="danger" subtitle={`${ozet.gecikenSayisi} kayıt`} />
      </div>

      {/* Durum filtresi */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["tumu", "bekliyor", "kismi", "gecikti", "odendi"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setFilterDurum(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              filterDurum === d
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {d === "tumu" ? "Tümü" : DURUM_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Müşteri bazlı kalan bakiye raporu */}
      <h3 className="mb-2 text-sm font-semibold text-slate-800">Tahsilat Listesi</h3>
      <div className="space-y-2">
        {bakiyeler.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Henüz tahsilat kaydı yok.
          </div>
        )}
        {bakiyeler.map((b) => {
          const musteriKayitlari = filtreli(
            tahsilatlar.filter((t) => t.musteriId === b.musteriId)
          ).sort((x, y) => x.vadeTarihi.localeCompare(y.vadeTarihi));
          if (filterDurum !== "tumu" && musteriKayitlari.length === 0) return null;
          const acik = acikMusteri === b.musteriId;
          return (
            <div key={b.musteriId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Müşteri özet satırı */}
              <button
                type="button"
                onClick={() => setAcikMusteri(acik ? null : b.musteriId)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {acik ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.musteriAdi}</p>
                    <p className="text-xs text-slate-500">
                      {b.kayitSayisi} kayıt
                      {b.gecikenSayisi > 0 ? ` · ${b.gecikenSayisi} geciken` : ""}
                      {b.enEskiVade ? ` · en eski vade ${formatTarih(b.enEskiVade)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400">Ödenen</p>
                    <p className="text-xs font-medium text-emerald-600">{formatPara(b.odenen)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Kalan</p>
                    <p className={`text-sm font-bold ${b.kalan > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatPara(b.kalan)}
                    </p>
                  </div>
                </div>
              </button>

              {/* Kayıt detayları */}
              {acik && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {musteriKayitlari.map((t) => {
                    const kalan = kalanBakiye(t);
                    const gecikmis = t.durum !== "odendi" && geciktiMi(t.vadeTarihi);
                    return (
                      <div key={t.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={secili.has(t.id)}
                              disabled={t.durum === "odendi"}
                              onChange={() => toggleSecili(t.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-700">
                                {t.donem} · vade {formatTarih(t.vadeTarihi)}
                                {gecikmis && t.durum !== "gecikti" ? " ⚠️" : ""}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {formatPara(t.tutar)}
                                {odenenTutari(t) > 0 && t.durum !== "odendi"
                                  ? ` · ödenen ${formatPara(odenenTutari(t))} · kalan ${formatPara(kalan)}`
                                  : ""}
                                {t.notlar ? ` · ${t.notlar}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant={DURUM_VARIANTS[t.durum]}>{DURUM_LABELS[t.durum]}</Badge>
                            {t.durum !== "odendi" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                  setKismiId(kismiId === t.id ? null : t.id);
                                  setKismiTutar("");
                                }}
                              >
                                <Banknote className="mr-1 h-3 w-3" />
                                Ödeme Al
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Kısmi ödeme girişi */}
                        {kismiId === t.id && (
                          <div className="mt-2 ml-6 flex items-end gap-2">
                            <div className="w-40">
                              <Input
                                label={`Tutar (kalan ${formatPara(kalan)})`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={kismiTutar}
                                onChange={(e) => setKismiTutar(e.target.value)}
                                placeholder={String(kalan)}
                              />
                            </div>
                            <Button size="sm" onClick={() => handleKismiOdeme(t)}>
                              Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setKismiTutar(String(kalan))}
                            >
                              Tamamını Öde
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="px-4 py-2 bg-slate-50">
                    <Link
                      href={`/musteriler/${b.musteriId}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Müşteri detayına git →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
