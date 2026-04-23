"use client";

import { useEffect, useState } from "react";
import { Calculator, Edit, Info, Save, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  createKDV2Hesaplama,
  deleteKDV2Hesaplama,
  updateKDV2Hesaplama,
} from "@/lib/firebase/repositories";
import { useToast } from "@/lib/context/ToastContext";
import { formatTarih, formatPara } from "@/lib/utils/format";
import type { KDV2Hesaplama } from "@/lib/types";

const KDV_ORANLARI = [
  { value: "1", label: "%1 KDV" },
  { value: "10", label: "%10 KDV" },
  { value: "20", label: "%20 KDV" },
];

const KDV2_ORANI_MAP: Record<string, number> = {
  "1": 0.5,
  "10": 0.5,
  "20": 0.5,
};

const initialForm = () => ({
  musteriId: "",
  belgeTarihi: new Date().toISOString().split("T")[0],
  belgeNo: "",
  kdvMatrahi: "",
  kdvOrani: "20",
  aciklama: "",
});

export default function KDV2Page() {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { kdv2: loadedKdv2, musteriler } = useAppData();
  const [kayitlar, setKayitlar] = useState<KDV2Hesaplama[]>(loadedKdv2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setKayitlar(loadedKdv2);
  }, [loadedKdv2]);

  const editingKayit = editingId ? kayitlar.find((kayit) => kayit.id === editingId) : null;
  const kdvMatrahi = parseFloat(form.kdvMatrahi) || 0;
  const kdvOrani = parseInt(form.kdvOrani);
  const kdvTutari = kdvMatrahi * (kdvOrani / 100);
  const kdv2Tutari = kdvTutari * KDV2_ORANI_MAP[form.kdvOrani];
  const toplamTutar = kdvMatrahi + kdvTutari;

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm());
  };

  const handleEdit = (kayit: KDV2Hesaplama) => {
    setEditingId(kayit.id);
    setForm({
      musteriId: kayit.musteriId ?? "",
      belgeTarihi: kayit.belgeTarihi.slice(0, 10),
      belgeNo: kayit.belgeNo,
      kdvMatrahi: String(kayit.kdvMatrahi),
      kdvOrani: String(kayit.kdvOrani),
      aciklama: kayit.aciklama ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!Number.isFinite(kdvMatrahi) || kdvMatrahi <= 0) {
      toast.error("Gecerli bir KDV matrahi girin");
      return;
    }

    const musteri = musteriler.find((m) => m.id === form.musteriId);
    const payload: Omit<KDV2Hesaplama, "id" | "createdAt"> = {
      musteriId: form.musteriId || undefined,
      musteriAdi: musteri?.firmaAdi,
      belgeTarihi: form.belgeTarihi,
      belgeNo: form.belgeNo,
      kdvMatrahi,
      kdvOrani,
      kdvTutari,
      kdv2Tutari,
      aciklama: form.aciklama.trim() || undefined,
    };

    setLoading(true);
    try {
      if (editingId) {
        const updated: KDV2Hesaplama = {
          ...(editingKayit ?? { id: editingId, createdAt: new Date().toISOString() }),
          ...payload,
        };

        if (isFirebaseConfigured) await updateKDV2Hesaplama(editingId, payload);

        setKayitlar((prev) => prev.map((kayit) => (kayit.id === editingId ? updated : kayit)));
        await logAudit({
          action: "update",
          entityType: "kdv2",
          entityId: editingId,
          entityLabel: updated.belgeNo,
          summary: "KDV2 kaydi guncellendi",
          before: editingKayit as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });
        toast.success("KDV2 kaydi guncellendi", `KDV2 Tutari: ${formatPara(kdv2Tutari)}`);
      } else {
        const created = isFirebaseConfigured
          ? await createKDV2Hesaplama(payload)
          : { id: `k-${Date.now()}`, ...payload, createdAt: new Date().toISOString() };

        setKayitlar((prev) => [created, ...prev]);
        await logAudit({
          action: "create",
          entityType: "kdv2",
          entityId: created.id,
          entityLabel: created.belgeNo,
          summary: "KDV2 kaydi olusturuldu",
          after: created as unknown as Record<string, unknown>,
        });
        toast.success("KDV2 hesaplamasi kaydedildi", `KDV2 Tutari: ${formatPara(kdv2Tutari)}`);
      }

      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("KDV2 kaydi kaydedilemedi", "Firebase baglantisi veya yetkileri kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (kayit: KDV2Hesaplama) => {
    if (!window.confirm(`${kayit.belgeNo} numarali KDV2 kaydi silinsin mi?`)) return;

    setKayitlar((prev) => prev.filter((item) => item.id !== kayit.id));
    if (editingId === kayit.id) resetForm();

    try {
      if (isFirebaseConfigured) await deleteKDV2Hesaplama(kayit.id);
      await logAudit({
        action: "delete",
        entityType: "kdv2",
        entityId: kayit.id,
        entityLabel: kayit.belgeNo,
        summary: "KDV2 kaydi silindi",
        before: kayit as unknown as Record<string, unknown>,
      });
      toast.success("KDV2 kaydi silindi");
    } catch (error) {
      console.error(error);
      setKayitlar((prev) => [kayit, ...prev]);
      toast.error("KDV2 kaydi silinemedi", "Firebase yetkilerini kontrol edin");
    }
  };

  const musteriOptions = [
    { value: "", label: "- Musteri secin -" },
    ...musteriler.map((m) => ({ value: m.id, label: m.firmaAdi })),
  ];

  return (
    <div>
      <PageHeader
        title="KDV2 Hesaplama"
        subtitle="Tevkifatli KDV hesaplama ve kayit modulu"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">KDV2 (Tevkifat) Hakkinda</p>
            <p className="text-xs text-blue-600 mt-1">
              KDV2 tevkifatinda, hizmet bedeli uzerinden hesaplanan KDV&apos;nin belirli kismi alici tarafindan beyan edilerek odenir. Bu modul KDV tevkifat tutarini otomatik hesaplar ve musteri bazli kayit altina alir.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                {editingId ? "KDV2 Kaydi Duzenle" : "Yeni Hesaplama"}
              </h3>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<X className="w-3.5 h-3.5" />}
                  onClick={resetForm}
                >
                  Vazgec
                </Button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Musteri"
                value={form.musteriId}
                onChange={(e) => setForm({ ...form, musteriId: e.target.value })}
                options={musteriOptions}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Belge Tarihi"
                  type="date"
                  value={form.belgeTarihi}
                  onChange={(e) => setForm({ ...form, belgeTarihi: e.target.value })}
                  required
                />
                <Input
                  label="Belge No"
                  type="text"
                  value={form.belgeNo}
                  onChange={(e) => setForm({ ...form, belgeNo: e.target.value })}
                  placeholder="FA-2024-001"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="KDV Matrahi (TL)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.kdvMatrahi}
                  onChange={(e) => setForm({ ...form, kdvMatrahi: e.target.value })}
                  placeholder="100000"
                  required
                />
                <Select
                  label="KDV Orani"
                  value={form.kdvOrani}
                  onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}
                  options={KDV_ORANLARI}
                />
              </div>
              <Input
                label="Aciklama (istege bagli)"
                type="text"
                value={form.aciklama}
                onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                placeholder="Hizmet turu veya belge aciklamasi..."
              />

              {kdvMatrahi > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 mb-3">Hesap Ozeti</p>
                  {[
                    { label: "KDV Matrahi", value: formatPara(kdvMatrahi), bold: false },
                    { label: `KDV Tutari (%${kdvOrani})`, value: formatPara(kdvTutari), bold: false },
                    { label: "Toplam Tutar", value: formatPara(toplamTutar), bold: false },
                    { label: `KDV2 Tevkifat (%${KDV2_ORANI_MAP[form.kdvOrani] * 100} tevkifat)`, value: formatPara(kdv2Tutari), bold: true },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className={`flex justify-between ${bold ? "pt-2 border-t border-slate-300" : ""}`}>
                      <span className={`text-xs ${bold ? "font-bold text-blue-700" : "text-slate-600"}`}>{label}</span>
                      <span className={`text-xs font-mono ${bold ? "font-bold text-blue-700 text-sm" : "text-slate-800 font-medium"}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" className="w-full" loading={loading} icon={editingId ? <Save className="w-4 h-4" /> : undefined}>
                {editingId ? "Kaydi Guncelle" : "Hesaplamayi Kaydet"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Tevkifat Oranlari</h3>
            <div className="space-y-2">
              {[
                { label: "%1 KDV islemleri", tevkifat: "%50 (1/2)" },
                { label: "%10 KDV islemleri", tevkifat: "%50 (1/2)" },
                { label: "%20 KDV islemleri", tevkifat: "%50 (1/2)" },
              ].map(({ label, tevkifat }) => (
                <div key={label} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-600">{label}</span>
                  <span className="text-xs font-semibold text-blue-700">{tevkifat}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              * Tevkifat oranlari hizmet turune gore degisebilir. Guncel oranlarda GIB mevzuatini kontrol edin.
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Son Hesaplamalar</h3>
            <div className="space-y-2.5">
              {kayitlar.slice(0, 5).map((k) => (
                <button
                  type="button"
                  key={k.id}
                  onClick={() => handleEdit(k)}
                  className="w-full text-left border border-slate-100 rounded-lg p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate flex-1">
                      {k.musteriAdi ?? "Genel Kayit"}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">{formatTarih(k.belgeTarihi)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Matrah: {formatPara(k.kdvMatrahi)}</span>
                    <span className="text-xs font-bold text-blue-700">KDV2: {formatPara(k.kdv2Tutari)}</span>
                  </div>
                  {k.aciklama && (
                    <p className="text-xs text-slate-400 mt-1">{k.aciklama}</p>
                  )}
                </button>
              ))}
              {kayitlar.length === 0 && (
                <p className="text-xs text-slate-400">Henuz KDV2 kaydi yok</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Tum KDV2 Kayitlari</h3>
        </div>
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Belge Tarihi</TableHeadCell>
              <TableHeadCell>Musteri</TableHeadCell>
              <TableHeadCell>Belge No</TableHeadCell>
              <TableHeadCell>KDV Matrahi</TableHeadCell>
              <TableHeadCell>KDV Orani</TableHeadCell>
              <TableHeadCell>KDV Tutari</TableHeadCell>
              <TableHeadCell>KDV2 Tutari</TableHeadCell>
              <TableHeadCell>Aciklama</TableHeadCell>
              <TableHeadCell>Islem</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {kayitlar.length === 0 ? (
              <TableEmpty colSpan={9} />
            ) : (
              kayitlar.map((k) => (
                <TableRow key={k.id}>
                  <TableCell><span className="text-xs text-slate-600">{formatTarih(k.belgeTarihi)}</span></TableCell>
                  <TableCell><span className="text-xs font-medium text-slate-800">{k.musteriAdi ?? "Genel Kayit"}</span></TableCell>
                  <TableCell><span className="text-xs font-mono text-slate-600">{k.belgeNo}</span></TableCell>
                  <TableCell><span className="text-xs font-medium text-slate-800">{formatPara(k.kdvMatrahi)}</span></TableCell>
                  <TableCell><span className="text-xs text-slate-600">%{k.kdvOrani}</span></TableCell>
                  <TableCell><span className="text-xs text-slate-800">{formatPara(k.kdvTutari)}</span></TableCell>
                  <TableCell><span className="text-xs font-bold text-blue-700">{formatPara(k.kdv2Tutari)}</span></TableCell>
                  <TableCell>
                    {k.aciklama ? (
                      <span className="text-xs text-slate-500">{k.aciklama}</span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(k)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Duzenle"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(k)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
}
