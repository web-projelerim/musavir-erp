"use client";

import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TableEmpty,
} from "@/components/ui/Table";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useKDV2 } from "@/lib/hooks/useKDV2";
import { useBeyannameler } from "@/lib/hooks/useBeyannameler";
import { useMusteriler } from "@/lib/hooks/useMusteriler";
import { kdv2Kaydet } from "@/lib/services/kdv2.service";
import { FB_CONFIGURED } from "@/lib/firebase/ready";
import { useToast } from "@/lib/context/ToastContext";
import { formatTarih, formatPara } from "@/lib/utils/format";
import type { KDV2Hesaplama } from "@/lib/types";

const KDV_ORANLARI = [
  { value: "1", label: "%1 KDV" },
  { value: "10", label: "%10 KDV" },
  { value: "20", label: "%20 KDV" },
];

const KDV2_TEVKIFAT = 0.5;

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", fontSize: 12, color: "#374151",
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none",
};

export default function KDV2Page() {
  const toast = useToast();
  const { data: kayitlar, loading } = useKDV2();
  const { data: musteriler } = useMusteriler();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    musteriId: "",
    belgeTarihi: new Date().toISOString().split("T")[0],
    belgeNo: "",
    kdvMatrahi: "",
    kdvOrani: "20",
    aciklama: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const kdvMatrahi = parseFloat(form.kdvMatrahi) || 0;
  const kdvOrani = parseInt(form.kdvOrani);
  const kdvTutari = kdvMatrahi * (kdvOrani / 100);
  const kdv2Tutari = kdvTutari * KDV2_TEVKIFAT;
  const toplamTutar = kdvMatrahi + kdvTutari;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.belgeNo.trim()) { toast.error("Belge numarası zorunludur"); return; }
    if (kdvMatrahi <= 0) { toast.error("KDV matrahı girilmelidir"); return; }

    setSaving(true);
    try {
      const musteri = musteriler.find((m) => m.id === form.musteriId);
      const data: Omit<KDV2Hesaplama, "id"> = {
        musteriId: form.musteriId || undefined,
        musteriAdi: musteri?.firmaAdi,
        belgeTarihi: form.belgeTarihi,
        belgeNo: form.belgeNo.trim(),
        kdvMatrahi,
        kdvOrani,
        kdvTutari,
        kdv2Tutari,
        aciklama: form.aciklama || undefined,
        createdAt: new Date().toISOString(),
      };

      if (FB_CONFIGURED) {
        await kdv2Kaydet(data);
      }

      toast.success("Kaydedildi", `KDV2 tutarı: ${formatPara(kdv2Tutari)}`);
      setForm({
        musteriId: "", belgeTarihi: new Date().toISOString().split("T")[0],
        belgeNo: "", kdvMatrahi: "", kdvOrani: "20", aciklama: "",
      });
    } catch {
      toast.error("Kayıt başarısız", "Lütfen tekrar deneyin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="KDV2 Hesaplama"
        subtitle="Tevkifatlı KDV hesaplama ve kayıt modülü"
      />

      {/* Bilgi kutusu */}
      <div className="rounded-md mb-5 flex items-start gap-3"
        style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 16px" }}>
        <Info style={{ width: 14, height: 14, color: "#2563eb", marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1e40af" }}>KDV2 (Tevkifat) Hakkında</p>
          <p style={{ fontSize: 11, color: "#3b82f6", marginTop: 3, lineHeight: 1.6 }}>
            Hizmet bedeli üzerinden hesaplanan KDV'nin yarısı (%50) alıcı tarafından bizzat beyan edilerek ödenir. Bu modül KDV tevkifat tutarını otomatik hesaplar ve kayıt altına alır.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-md" style={{ border: "1px solid #e5e7eb", padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <Calculator style={{ width: 14, height: 14, color: "#2563eb" }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Yeni Hesaplama</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                Müşteri
              </label>
              <select value={form.musteriId} onChange={(e) => set("musteriId", e.target.value)} style={fieldStyle}>
                <option value="">— Müşteri seçin —</option>
                {musteriler.map((m) => <option key={m.id} value={m.id}>{m.firmaAdi}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                  Belge Tarihi *
                </label>
                <input type="date" value={form.belgeTarihi} onChange={(e) => set("belgeTarihi", e.target.value)}
                  required style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                  Belge No *
                </label>
                <input type="text" value={form.belgeNo} onChange={(e) => set("belgeNo", e.target.value)}
                  placeholder="FA-2024-001" required style={fieldStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                  KDV Matrahı (TL) *
                </label>
                <input type="number" value={form.kdvMatrahi} onChange={(e) => set("kdvMatrahi", e.target.value)}
                  placeholder="100000" required min="0" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                  KDV Oranı
                </label>
                <select value={form.kdvOrani} onChange={(e) => set("kdvOrani", e.target.value)} style={fieldStyle}>
                  {KDV_ORANLARI.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                Açıklama
              </label>
              <input type="text" value={form.aciklama} onChange={(e) => set("aciklama", e.target.value)}
                placeholder="Hizmet türü veya belge açıklaması..." style={fieldStyle} />
            </div>

            {/* Hesap özeti */}
            {kdvMatrahi > 0 && (
              <div className="rounded-md space-y-2"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "12px 14px" }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Hesap Özeti</p>
                {[
                  { label: "KDV Matrahı", value: formatPara(kdvMatrahi), bold: false },
                  { label: `KDV Tutarı (%${kdvOrani})`, value: formatPara(kdvTutari), bold: false },
                  { label: "Toplam Tutar", value: formatPara(toplamTutar), bold: false },
                  { label: `KDV2 Tevkifat (%${KDV2_TEVKIFAT * 100})`, value: formatPara(kdv2Tutari), bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between"
                    style={bold ? { paddingTop: 8, borderTop: "1px solid #e5e7eb", marginTop: 4 } : {}}>
                    <span style={{ fontSize: 11, color: bold ? "#1d4ed8" : "#6b7280",
                      fontWeight: bold ? 700 : 400 }}>
                      {label}
                    </span>
                    <span style={{ fontSize: bold ? 13 : 11, fontFamily: "monospace",
                      color: bold ? "#1d4ed8" : "#374151", fontWeight: bold ? 700 : 500 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" loading={saving} style={{ width: "100%" }}>
              Hesaplamayı Kaydet
            </Button>
          </form>
        </div>

        {/* Sağ kolon */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-md" style={{ border: "1px solid #e5e7eb", padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
              Tevkifat Oranları
            </p>
            <div className="space-y-2">
              {[
                { label: "%1 KDV işlemleri", tevkifat: "%50 (1/2)" },
                { label: "%10 KDV işlemleri", tevkifat: "%50 (1/2)" },
                { label: "%20 KDV işlemleri", tevkifat: "%50 (1/2)" },
              ].map(({ label, tevkifat }) => (
                <div key={label} className="flex items-center justify-between"
                  style={{ background: "#f9fafb", padding: "7px 10px", borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8" }}>{tevkifat}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 10 }}>
              * Oranlar hizmet türüne göre değişebilir. GİB mevzuatını kontrol edin.
            </p>
          </div>

          <div className="bg-white rounded-md" style={{ border: "1px solid #e5e7eb", padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
              Son Hesaplamalar
            </p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton rounded" style={{ height: 52 }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {kayitlar.slice(0, 5).map((k) => (
                  <div key={k.id} className="rounded-md"
                    style={{ border: "1px solid #f3f4f6", padding: "10px 12px" }}>
                    <div className="flex items-start justify-between mb-1">
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}
                        className="truncate flex-1">
                        {k.musteriAdi || k.belgeNo}
                      </span>
                      <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 8 }}>
                        {formatTarih(k.belgeTarihi)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 11, color: "#6b7280" }}>
                        Matrah: {formatPara(k.kdvMatrahi)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                        KDV2: {formatPara(k.kdv2Tutari)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geçmiş kayıtlar */}
      <div className="mt-5 bg-white rounded-md overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Tüm KDV2 Kayıtları</p>
        </div>
        <Table>
          <TableHead>
            <tr>
              <TableHeadCell>Belge Tarihi</TableHeadCell>
              <TableHeadCell>Müşteri</TableHeadCell>
              <TableHeadCell>Belge No</TableHeadCell>
              <TableHeadCell>KDV Matrahı</TableHeadCell>
              <TableHeadCell>Oran</TableHeadCell>
              <TableHeadCell>KDV Tutarı</TableHeadCell>
              <TableHeadCell>KDV2 Tutarı</TableHeadCell>
              <TableHeadCell>Açıklama</TableHeadCell>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTable rows={5} cols={8} />
            ) : kayitlar.length === 0 ? (
              <TableEmpty colSpan={8} />
            ) : (
              kayitlar.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{formatTarih(k.belgeTarihi)}</span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>
                      {k.musteriAdi || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280" }}>
                      {k.belgeNo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                      {formatPara(k.kdvMatrahi)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>%{k.kdvOrani}</span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, color: "#374151" }}>{formatPara(k.kdvTutari)}</span>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                      {formatPara(k.kdv2Tutari)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {k.aciklama ? (
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{k.aciklama}</span>
                    ) : <span style={{ fontSize: 11, color: "#d1d5db" }}>—</span>}
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
