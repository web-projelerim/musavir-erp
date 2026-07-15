"use client";

import { useMemo, useState } from "react";
import { Rocket, Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageLoading } from "@/components/ui/PageLoading";
import { InfoBanner } from "@/components/ui/InfoBanner";
import { useAppData } from "@/lib/hooks/useAppData";
import { useCollectionData } from "@/lib/hooks/useCollectionData";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { COLLECTIONS } from "@/lib/firebase/firestore";
import {
  createTeknokentProje,
  updateTeknokentProje,
  deleteTeknokentProje,
} from "@/lib/firebase/repositories";
import { formatTarih } from "@/lib/utils/format";
import type { TeknokentProje, TeknokentProjeDurum } from "@/lib/types";

const DURUM_LABELS: Record<TeknokentProjeDurum, string> = {
  aktif: "Aktif",
  tamamlandi: "Tamamlandı",
  askida: "Askıda",
};
const DURUM_VARIANTS: Record<TeknokentProjeDurum, "info" | "success" | "warning"> = {
  aktif: "info",
  tamamlandi: "success",
  askida: "warning",
};

function gunKaldi(bitis?: string): number | null {
  if (!bitis) return null;
  const fark = new Date(bitis).getTime() - Date.now();
  return Math.ceil(fark / (1000 * 60 * 60 * 24));
}

interface FormState {
  musteriId: string;
  projeAdi: string;
  projeKodu: string;
  teknokentAdi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  durum: TeknokentProjeDurum;
  aciklama: string;
}

const BOS_FORM: FormState = {
  musteriId: "",
  projeAdi: "",
  projeKodu: "",
  teknokentAdi: "",
  baslangicTarihi: "",
  bitisTarihi: "",
  durum: "aktif",
  aciklama: "",
};

export default function TeknokentPage() {
  const { musteriler, loading: appLoading } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();

  const isStaff = user?.rol !== "mukellef";
  const projeler = useCollectionData<TeknokentProje>(
    COLLECTIONS.teknokentProjeler,
    [],
    !!user && isStaff,
    user?.ofisId
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<TeknokentProje | null>(null);
  const [form, setForm] = useState<FormState>(BOS_FORM);
  const [saving, setSaving] = useState(false);

  const aktifMusteriler = useMemo(
    () => musteriler.filter((m) => m.durum === "aktif").sort((a, b) => a.firmaAdi.localeCompare(b.firmaAdi, "tr")),
    [musteriler]
  );

  const sirali = useMemo(
    () =>
      [...projeler.data].sort((a, b) => {
        // Bitiş tarihi olanlar önce, en yakın bitiş üstte
        if (!a.bitisTarihi && !b.bitisTarihi) return a.projeAdi.localeCompare(b.projeAdi, "tr");
        if (!a.bitisTarihi) return 1;
        if (!b.bitisTarihi) return -1;
        return a.bitisTarihi.localeCompare(b.bitisTarihi);
      }),
    [projeler.data]
  );

  const ozet = useMemo(() => {
    const aktif = projeler.data.filter((p) => p.durum === "aktif").length;
    const yaklasan = projeler.data.filter((p) => {
      const g = gunKaldi(p.bitisTarihi);
      return p.durum === "aktif" && g !== null && g >= 0 && g <= 30;
    }).length;
    return { toplam: projeler.data.length, aktif, yaklasan };
  }, [projeler.data]);

  const acModal = (p?: TeknokentProje) => {
    if (p) {
      setDuzenlenen(p);
      setForm({
        musteriId: p.musteriId,
        projeAdi: p.projeAdi,
        projeKodu: p.projeKodu ?? "",
        teknokentAdi: p.teknokentAdi ?? "",
        baslangicTarihi: p.baslangicTarihi ?? "",
        bitisTarihi: p.bitisTarihi ?? "",
        durum: p.durum,
        aciklama: p.aciklama ?? "",
      });
    } else {
      setDuzenlenen(null);
      setForm(BOS_FORM);
    }
    setModalOpen(true);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.musteriId || !form.projeAdi.trim()) {
      toast.error("Mükellef ve proje adı zorunludur");
      return;
    }
    const musteri = musteriler.find((m) => m.id === form.musteriId);
    setSaving(true);
    try {
      const veri = {
        musteriId: form.musteriId,
        musteriAdi: musteri?.firmaAdi ?? "",
        projeAdi: form.projeAdi.trim(),
        projeKodu: form.projeKodu.trim() || undefined,
        teknokentAdi: form.teknokentAdi.trim() || musteri?.teknokentAdi || undefined,
        baslangicTarihi: form.baslangicTarihi || undefined,
        bitisTarihi: form.bitisTarihi || undefined,
        durum: form.durum,
        aciklama: form.aciklama.trim() || undefined,
      };
      if (duzenlenen) {
        await updateTeknokentProje(duzenlenen.id, veri);
        logAudit({
          action: "update",
          entityType: "teknokent",
          entityId: duzenlenen.id,
          entityLabel: form.projeAdi,
          summary: `Teknokent projesi güncellendi: ${form.projeAdi}`,
        }).catch(() => undefined);
      } else if (user?.ofisId) {
        const kayit = await createTeknokentProje({ ofisId: user.ofisId, ...veri });
        logAudit({
          action: "create",
          entityType: "teknokent",
          entityId: kayit.id,
          entityLabel: form.projeAdi,
          summary: `Teknokent projesi eklendi: ${form.projeAdi} (${musteri?.firmaAdi ?? ""})`,
        }).catch(() => undefined);
      }
      toast.success(duzenlenen ? "Proje güncellendi" : "Proje eklendi", form.projeAdi);
      setModalOpen(false);
    } catch (err) {
      toast.error("Kaydedilemedi", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleSil = async (p: TeknokentProje) => {
    if (!confirm(`"${p.projeAdi}" projesi silinsin mi?`)) return;
    try {
      await deleteTeknokentProje(p.id);
      logAudit({
        action: "delete",
        entityType: "teknokent",
        entityId: p.id,
        entityLabel: p.projeAdi,
        summary: `Teknokent projesi silindi: ${p.projeAdi}`,
      }).catch(() => undefined);
      toast.success("Proje silindi");
    } catch (err) {
      toast.error("Silinemedi", err instanceof Error ? err.message : undefined);
    }
  };

  if (appLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="Teknokent Proje Takip"
        subtitle={`${projeler.data.length} proje`}
        breadcrumb={[{ label: "Ana Sayfa", href: "/dashboard" }, { label: "Teknokent" }]}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => acModal()}>
            Yeni Proje
          </Button>
        }
      />

      {ozet.yaklasan > 0 && (
        <div className="mb-4">
          <InfoBanner variant="warning">
            <strong>{ozet.yaklasan}</strong> projenin bitiş tarihi 30 gün içinde. Süre uzatımı / kapanış işlemlerini kontrol edin.
          </InfoBanner>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 mb-5">
        <MetricCard title="Toplam Proje" value={String(ozet.toplam)} />
        <MetricCard title="Aktif" value={String(ozet.aktif)} variant="success" />
        <MetricCard title="30 Günde Bitecek" value={String(ozet.yaklasan)} variant="warning" />
      </div>

      {sirali.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <Rocket className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Henüz teknokent projesi kaydı yok.
          <p className="mt-1 text-xs text-slate-400">Yukarıdaki &quot;Yeni Proje&quot; ile ekleyin.</p>
        </div>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2.5">Proje</th>
                  <th className="px-3 py-2.5">Mükellef</th>
                  <th className="px-3 py-2.5">Teknokent</th>
                  <th className="px-3 py-2.5">Başlangıç</th>
                  <th className="px-3 py-2.5">Bitiş</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sirali.map((p) => {
                  const g = gunKaldi(p.bitisTarihi);
                  const yaklasiyor = p.durum === "aktif" && g !== null && g >= 0 && g <= 30;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{p.projeAdi}</p>
                        {p.projeKodu && <p className="text-xs text-slate-400">{p.projeKodu}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/musteriler/${p.musteriId}`} className="text-slate-600 hover:text-blue-600">
                          {p.musteriAdi}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{p.teknokentAdi ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-500">{p.baslangicTarihi ? formatTarih(p.baslangicTarihi) : "—"}</td>
                      <td className="px-3 py-2.5">
                        {p.bitisTarihi ? (
                          <span className={yaklasiyor ? "text-amber-600 font-medium" : "text-slate-500"}>
                            {formatTarih(p.bitisTarihi)}
                            {yaklasiyor && <span className="ml-1 text-xs">({g} gün)</span>}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={DURUM_VARIANTS[p.durum]}>{DURUM_LABELS[p.durum]}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => acModal(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded"
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSil(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil kartlar */}
          <div className="md:hidden space-y-2">
            {sirali.map((p) => {
              const g = gunKaldi(p.bitisTarihi);
              const yaklasiyor = p.durum === "aktif" && g !== null && g >= 0 && g <= 30;
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{p.projeAdi}</p>
                      <p className="text-xs text-slate-500">{p.musteriAdi}{p.teknokentAdi ? ` · ${p.teknokentAdi}` : ""}</p>
                    </div>
                    <Badge variant={DURUM_VARIANTS[p.durum]}>{DURUM_LABELS[p.durum]}</Badge>
                  </div>
                  {p.bitisTarihi && (
                    <p className={`mt-1.5 flex items-center gap-1 text-xs ${yaklasiyor ? "text-amber-600" : "text-slate-500"}`}>
                      <CalendarClock className="h-3 w-3" /> Bitiş: {formatTarih(p.bitisTarihi)}
                      {yaklasiyor && ` (${g} gün)`}
                    </p>
                  )}
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => acModal(p)}>
                      Düzenle
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs text-red-600" onClick={() => handleSil(p)}>
                      Sil
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* STUB — MVP dışı: faz-2 proje bazlı finansal takip altyapısı (§3.3).
          Şimdilik yalnızca yol haritası olarak gösterilir; fonksiyonel değil. */}
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Faz-2</span>
          Proje Bazlı Takip — Yakında
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Aşağıdaki modüller sonraki fazda eklenecek. Şu an yalnızca planlama amaçlı gösterilir.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { baslik: "Aylık Gider Takibi", aciklama: "Proje bazlı gider kalemleri ve toplam" },
            { baslik: "Aylık Gelir Takibi", aciklama: "Proje bazlı hakediş / gelir kaydı" },
            { baslik: "Personel Saat Girişi", aciklama: "Ar-Ge personeli çalışma saati" },
            { baslik: "Vergisel Avantaj Raporu", aciklama: "İstisna/teşvik tutar hesaplaması" },
          ].map((s) => (
            <div key={s.baslik} className="rounded-lg border border-slate-200 bg-white p-3 opacity-70">
              <p className="text-xs font-semibold text-slate-600">{s.baslik}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{s.aciklama}</p>
              <span className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                Faz-2
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ekle/Düzenle modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={duzenlenen ? "Proje Düzenle" : "Yeni Teknokent Projesi"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mükellef *</label>
            <select
              value={form.musteriId}
              onChange={(e) => set("musteriId", e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seçin —</option>
              {aktifMusteriler.map((m) => (
                <option key={m.id} value={m.id}>{m.firmaAdi}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Proje Adı *" value={form.projeAdi} onChange={(e) => set("projeAdi", e.target.value)} required />
            <Input label="Proje Kodu" value={form.projeKodu} onChange={(e) => set("projeKodu", e.target.value)} />
            <Input
              label="Teknokent Adı"
              value={form.teknokentAdi}
              onChange={(e) => set("teknokentAdi", e.target.value)}
              placeholder="ör: ODTÜ Teknokent, İTÜ Arı"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Durum</label>
              <select
                value={form.durum}
                onChange={(e) => set("durum", e.target.value as TeknokentProjeDurum)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="aktif">Aktif</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="askida">Askıda</option>
              </select>
            </div>
            <Input label="Başlangıç Tarihi" type="date" value={form.baslangicTarihi} onChange={(e) => set("baslangicTarihi", e.target.value)} />
            <Input label="Bitiş Tarihi (Tahmini)" type="date" value={form.bitisTarihi} onChange={(e) => set("bitisTarihi", e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama / Notlar</label>
            <textarea
              rows={3}
              value={form.aciklama}
              onChange={(e) => set("aciklama", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>İptal</Button>
            <Button type="submit" loading={saving}>{duzenlenen ? "Güncelle" : "Ekle"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
