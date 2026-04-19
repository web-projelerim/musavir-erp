"use client";

import { useState } from "react";
import { Calculator, Plus, Trash2, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty
} from "@/components/ui/Table";
import { MOCK_KDV2, MOCK_MUSTERILER } from "@/lib/data/mock";
import { formatTarih, formatPara } from "@/lib/utils/format";

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

export default function KDV2Page() {
  const [form, setForm] = useState({
    musteriId: "",
    belgeTarihi: new Date().toISOString().split("T")[0],
    belgeNo: "",
    kdvMatrahi: "",
    kdvOrani: "20",
    aciklama: "",
  });

  const kdvMatrahi = parseFloat(form.kdvMatrahi) || 0;
  const kdvOrani = parseInt(form.kdvOrani);
  const kdvTutari = kdvMatrahi * (kdvOrani / 100);
  const kdv2Tutari = kdvTutari * KDV2_ORANI_MAP[form.kdvOrani];
  const toplamTutar = kdvMatrahi + kdvTutari;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`KDV2 Hesaplaması kaydedildi!\nKDV2 Tutarı: ${formatPara(kdv2Tutari)}`);
  };

  const musteriOptions = [
    { value: "", label: "— Müşteri seçin —" },
    ...MOCK_MUSTERILER.map((m) => ({ value: m.id, label: m.firmaAdi })),
  ];

  return (
    <div>
      <PageHeader
        title="KDV2 Hesaplama"
        subtitle="Tevkifatlı KDV hesaplama ve kayıt modülü"
      />

      {/* Açıklama kutusu */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">KDV2 (Tevkifat) Hakkında</p>
            <p className="text-xs text-blue-600 mt-1">
              KDV2 tevkifatında, hizmet bedeli üzerinden hesaplanan KDV'nin yarısı (%50) alıcı tarafından bizzat beyan edilerek ödenir. Bu modül KDV tevkifat tutarını otomatik hesaplar ve müşteri bazlı kayıt altına alır.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3">
          <Card>
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              Yeni Hesaplama
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Müşteri"
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
                  label="KDV Matrahı (TL)"
                  type="number"
                  value={form.kdvMatrahi}
                  onChange={(e) => setForm({ ...form, kdvMatrahi: e.target.value })}
                  placeholder="100000"
                  required
                />
                <Select
                  label="KDV Oranı"
                  value={form.kdvOrani}
                  onChange={(e) => setForm({ ...form, kdvOrani: e.target.value })}
                  options={KDV_ORANLARI}
                />
              </div>
              <Input
                label="Açıklama (İsteğe bağlı)"
                type="text"
                value={form.aciklama}
                onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                placeholder="Hizmet türü veya belge açıklaması..."
              />

              {/* Hesap özeti */}
              {kdvMatrahi > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 mb-3">Hesap Özeti</p>
                  {[
                    { label: "KDV Matrahı", value: formatPara(kdvMatrahi), bold: false },
                    { label: `KDV Tutarı (%${kdvOrani})`, value: formatPara(kdvTutari), bold: false },
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

              <Button type="submit" className="w-full">
                Hesaplamayı Kaydet
              </Button>
            </form>
          </Card>
        </div>

        {/* Sağ kolon */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hızlı özet */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Tevkifat Oranları</h3>
            <div className="space-y-2">
              {[
                { label: "%1 KDV işlemleri", tevkifat: "%50 (1/2)" },
                { label: "%10 KDV işlemleri", tevkifat: "%50 (1/2)" },
                { label: "%20 KDV işlemleri", tevkifat: "%50 (1/2)" },
              ].map(({ label, tevkifat }) => (
                <div key={label} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-600">{label}</span>
                  <span className="text-xs font-semibold text-blue-700">{tevkifat}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              * Tevkifat oranları hizmet türüne göre değişebilir. Güncel oranlarda GİB mevzuatını kontrol edin.
            </p>
          </Card>

          {/* Son hesaplamalar */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Son Hesaplamalar</h3>
            <div className="space-y-2.5">
              {MOCK_KDV2.map((k) => (
                <div key={k.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate flex-1">
                      {k.musteriAdi}
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
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Geçmiş kayıtlar */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Tüm KDV2 Kayıtları</h3>
        </div>
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Belge Tarihi</TableHeadCell>
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>Belge No</TableHeadCell>
              <TableHeadCell>KDV Matrahı</TableHeadCell>
              <TableHeadCell>KDV Oranı</TableHeadCell>
              <TableHeadCell>KDV Tutarı</TableHeadCell>
              <TableHeadCell>KDV2 Tutarı</TableHeadCell>
              <TableHeadCell>Açıklama</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {MOCK_KDV2.length === 0 ? (
              <TableEmpty colSpan={8} />
            ) : (
              MOCK_KDV2.map((k) => (
                <TableRow key={k.id}>
                  <TableCell><span className="text-xs text-slate-600">{formatTarih(k.belgeTarihi)}</span></TableCell>
                  <TableCell><span className="text-xs font-medium text-slate-800">{k.musteriAdi}</span></TableCell>
                  <TableCell><span className="text-xs font-mono text-slate-600">{k.belgeNo}</span></TableCell>
                  <TableCell><span className="text-xs font-medium text-slate-800">{formatPara(k.kdvMatrahi)}</span></TableCell>
                  <TableCell><span className="text-xs text-slate-600">%{k.kdvOrani}</span></TableCell>
                  <TableCell><span className="text-xs text-slate-800">{formatPara(k.kdvTutari)}</span></TableCell>
                  <TableCell><span className="text-xs font-bold text-blue-700">{formatPara(k.kdv2Tutari)}</span></TableCell>
                  <TableCell>
                    {k.aciklama ? (
                      <span className="text-xs text-slate-500">{k.aciklama}</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
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
