"use client";

import { useState } from "react";
import { FileSpreadsheet, Download, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeadCell, TableRow } from "@/components/ui/Table";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createMusteri, updateMusteri } from "@/lib/firebase/repositories";
import {
  buildMusteriImportPreview,
  downloadImportErrors,
  downloadMusteriImportTemplate,
  parseMusteriExcelFile,
  type MusteriImportPreview,
} from "@/lib/domain/excelImport";
import { getOfisId } from "@/lib/domain/office";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MusteriImportModal({ open, onClose }: Props) {
  const toast = useToast();
  const logAudit = useAuditLog();
  const { user } = useAuth();
  const { musteriler } = useAppData();
  const [preview, setPreview] = useState<MusteriImportPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const validRows = preview.filter((row) => row.decision !== "invalid" && row.decision !== "skip");
  const invalidRows = preview.filter((row) => row.decision === "invalid");

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const rows = await parseMusteriExcelFile(file);
      setPreview(buildMusteriImportPreview(rows, musteriler));
      setFileName(file.name);
    } catch (error) {
      console.error(error);
      toast.error("Excel okunamadi", "Dosya formatini ve basliklari kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    const importBatchId = `import-${Date.now()}`;
    setLoading(true);

    try {
      if (isFirebaseConfigured) {
        for (const row of validRows) {
          const payload = {
            ofisId: getOfisId(user?.ofisId),
            firmaAdi: row.firmaAdi,
            vknTckn: row.vknTckn,
            yetkiliAd: row.yetkiliAd,
            telefon: row.telefon,
            email: row.email,
            adres: row.adres,
            sorumluPersonel: row.sorumluPersonel,
            kdvMukellef: row.kdvMukellef,
            muhtasarMukellef: row.muhtasarMukellef,
            varsayilanHizmetUcreti: row.varsayilanHizmetUcreti,
            importBatchId,
            kaynak: "excel" as const,
          };

          if (row.decision === "update" && row.existingMusteriId) {
            await updateMusteri(row.existingMusteriId, payload);
          } else {
            await createMusteri(payload);
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      await logAudit({
        action: "import",
        entityType: "musteri",
        entityId: importBatchId,
        entityLabel: fileName,
        summary: `${validRows.length} musteri Excel importu ile islendi`,
        after: { importBatchId, validRows: validRows.length, invalidRows: invalidRows.length },
      });
      toast.success("Import tamamlandi", `${validRows.length} kayit islendi`);
      setPreview([]);
      setFileName("");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Import tamamlanamadi", "Firebase yetkilerini veya dosya verisini kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Excel ile Musteri Importu" size="xl">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Musteri listenizi XLSX/CSV dosyasi ile yukleyin</p>
              <p className="text-xs text-slate-500">Firma adi ve VKN/TCKN zorunludur; tekrar eden kayitlar guncelleme olarak isaretlenir.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadMusteriImportTemplate}>
            Sablon
          </Button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-blue-300 hover:bg-blue-50/40">
          <Upload className="mb-2 h-6 w-6 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{fileName || "Dosya secin"}</span>
          <span className="mt-1 text-xs text-slate-500">.xlsx, .xls veya .csv</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{validRows.length} islenecek</Badge>
              <Badge variant={invalidRows.length > 0 ? "danger" : "neutral"}>{invalidRows.length} hatali</Badge>
              {invalidRows.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => downloadImportErrors(preview)}>
                  Hatalari indir
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeadCell>Satir</TableHeadCell>
                    <TableHeadCell>Firma</TableHeadCell>
                    <TableHeadCell>VKN/TCKN</TableHeadCell>
                    <TableHeadCell>Karar</TableHeadCell>
                    <TableHeadCell>Not</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {preview.length === 0 ? (
                    <TableEmpty colSpan={5} />
                  ) : (
                    preview.map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.vknTckn}`}>
                        <TableCell><span className="text-xs text-slate-600">{row.rowNumber}</span></TableCell>
                        <TableCell><span className="text-xs font-medium text-slate-800">{row.firmaAdi || "-"}</span></TableCell>
                        <TableCell><span className="font-mono text-xs text-slate-600">{row.vknTckn || "-"}</span></TableCell>
                        <TableCell>
                          <Badge variant={row.decision === "invalid" ? "danger" : row.decision === "update" ? "warning" : "success"}>
                            {row.decision === "create" ? "Yeni" : row.decision === "update" ? "Guncelle" : "Hatali"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <span className="text-xs text-slate-500">{row.errors.join(", ") || "Hazir"}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Iptal</Button>
          <Button type="button" loading={loading} disabled={validRows.length === 0} onClick={handleImport}>
            Ice Aktar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
