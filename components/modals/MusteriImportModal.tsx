"use client";

import { useState } from "react";
import { FileSpreadsheet, Download, Upload, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeadCell, TableRow } from "@/components/ui/Table";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { authHeaders, isFirebaseConfigured } from "@/lib/firebase/client";
import { createMusteri, updateMusteri } from "@/lib/firebase/repositories";
import {
  buildMusteriImportPreview,
  detectExcelType,
  downloadImportErrors,
  downloadMusteriImportTemplate,
  mergeWithGibRows,
  parseGibExcelFile,
  parseMusteriExcelFile,
  type GibImportRow,
  type MusteriImportPreview,
  type MusteriImportRow,
} from "@/lib/domain/excelImport";
import { getOfisId } from "@/lib/domain/office";

type ConfirmStep = "none" | "updates" | "eksik";

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
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [musteriRowsCache, setMusteriRowsCache] = useState<MusteriImportRow[]>([]);
  const [gibRowsCache, setGibRowsCache] = useState<GibImportRow[]>([]);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("none");
  // eksik onaylandıktan sonra update onayına geçmek için
  const [eksikOnaylandi, setEksikOnaylandi] = useState(false);

  const createRows = preview.filter((r) => r.decision === "create");
  const updateRows = preview.filter((r) => r.decision === "update");
  const eksikRows = preview.filter((r) => r.decision === "eksik");
  const invalidRows = preview.filter((r) => r.decision === "invalid");
  const gibEslesenSayisi = preview.filter((r) => r.gibEslesti).length;

  // "İçe Aktar" düğmesinde görünen: create + update + (onaylandıysa eksik)
  const importableRows = preview.filter(
    (r) => r.decision === "create" || r.decision === "update" || r.decision === "eksik"
  );

  const buildPreview = (musteriRows: MusteriImportRow[], gibRows: GibImportRow[]) => {
    const merged = gibRows.length > 0 ? mergeWithGibRows(musteriRows, gibRows) : musteriRows;
    setPreview(buildMusteriImportPreview(merged, musteriler));
    setEksikOnaylandi(false);
    setConfirmStep("none");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      let musteriRows: MusteriImportRow[] = musteriRowsCache;
      let gibRows: GibImportRow[] = gibRowsCache;
      const names: string[] = [...fileNames];

      for (const file of Array.from(files)) {
        const type = await detectExcelType(file);
        if (type === "gib") {
          gibRows = await parseGibExcelFile(file);
          setGibRowsCache(gibRows);
          if (!names.includes(file.name)) names.push(file.name);
        } else {
          musteriRows = await parseMusteriExcelFile(file);
          setMusteriRowsCache(musteriRows);
          if (!names.includes(file.name)) names.unshift(file.name);
        }
      }

      setFileNames(names);
      if (musteriRows.length > 0) buildPreview(musteriRows, gibRows);
    } catch (error) {
      console.error(error);
      toast.error("Excel okunamadı", "Dosya formatını ve başlıkları kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  const doImport = async (includeEksik: boolean, includeUpdates: boolean) => {
    const rows = preview.filter((r) => {
      if (r.decision === "create") return true;
      if (r.decision === "update") return includeUpdates;
      if (r.decision === "eksik") return includeEksik;
      return false;
    });

    if (rows.length === 0) return;
    const importBatchId = `import-${Date.now()}`;
    setLoading(true);
    setConfirmStep("none");

    try {
      if (isFirebaseConfigured) {
        for (const row of rows) {
          // GİB şifresini sunucuda şifrele
          let gibEncryptedIvdSifre: string | undefined;
          if (row.gibParola) {
            try {
              const res = await fetch("/api/gib/secrets", {
                method: "POST",
                headers: await authHeaders(),
                body: JSON.stringify({ ivdSifre: row.gibParola }),
              });
              if (res.ok) {
                const data = await res.json();
                gibEncryptedIvdSifre = data.encrypted?.ivdSifre;
              }
            } catch {
              // Şifreleme başarısız olursa GİB bilgisi kaydedilmez, mükellef yine de eklenir
            }
          }

          const payload = {
            ofisId: getOfisId(user?.ofisId),
            firmaAdi: row.firmaAdi || row.kisaAd || row.yetkiliAd,
            vknTckn: row.vknTckn,
            vergiDairesi: row.vergiDairesi || undefined,
            kurulusTarihi: row.kurulusTarihi || undefined,
            aciklama: row.aciklama || undefined,
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
            gibIvdKullaniciAdi: row.gibKullaniciAdi || undefined,
            gibEncryptedIvdSifre: gibEncryptedIvdSifre || undefined,
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
        entityLabel: fileNames.join(", "),
        summary: `${rows.length} mükellef Excel importu ile işlendi`,
        after: { importBatchId, total: rows.length, invalid: invalidRows.length },
      });

      toast.success("Import tamamlandı", `${rows.length} kayıt işlendi`);
      resetState();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Import tamamlanamadı", "Firebase yetkilerini veya dosya verisini kontrol edin");
    } finally {
      setLoading(false);
    }
  };

  /** İçe Aktar tıklanınca sıralı onay adımlarını başlatır */
  const handleImportClick = () => {
    if (eksikRows.length > 0 && !eksikOnaylandi) {
      setConfirmStep("eksik");
    } else if (updateRows.length > 0) {
      setConfirmStep("updates");
    } else {
      doImport(eksikOnaylandi, true);
    }
  };

  const handleEksikOnayla = () => {
    setEksikOnaylandi(true);
    if (updateRows.length > 0) {
      setConfirmStep("updates");
    } else {
      doImport(true, true);
    }
  };

  const handleEksikAtla = () => {
    setEksikOnaylandi(false);
    if (updateRows.length > 0) {
      setConfirmStep("updates");
    } else {
      doImport(false, true);
    }
  };

  const resetState = () => {
    setPreview([]);
    setFileNames([]);
    setMusteriRowsCache([]);
    setGibRowsCache([]);
    setConfirmStep("none");
    setEksikOnaylandi(false);
  };

  const decisionBadge = (row: MusteriImportPreview) => {
    if (row.decision === "create") return <Badge variant="success">Yeni</Badge>;
    if (row.decision === "update") return <Badge variant="warning">Güncelle</Badge>;
    if (row.decision === "eksik") return <Badge variant="warning">Eksik bilgi</Badge>;
    return <Badge variant="danger">Hatalı</Badge>;
  };

  const showingPanel = confirmStep !== "none";

  return (
    <Modal open={open} onClose={() => { resetState(); onClose(); }} title="Excel ile Müşteri İçe Aktarımı" size="xl">
      <div className="space-y-4">

        {/* Bilgi + Şablon */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Mükellef Excel İçe Aktarma</p>
              <p className="text-xs text-slate-500">
                Luca&apos;dan aldığınız mükellef excellerini yükleyebilirsiniz. Birden fazla excel yüklerseniz veriler eşleştirilecektir.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadMusteriImportTemplate}>
            Şablon
          </Button>
        </div>

        {/* Upload Alanı */}
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-blue-300 hover:bg-blue-50/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          {loading ? (
            <>
              <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium text-slate-700">İşleniyor...</span>
              <span className="mt-1 text-xs text-slate-500">Excel okunuyor, lütfen bekleyin</span>
            </>
          ) : (
            <>
              <Upload className="mb-2 h-6 w-6 text-slate-400" />
              {fileNames.length === 0 ? (
                <>
                  <span className="text-sm font-medium text-slate-700">Dosya seçin veya buraya sürükleyin</span>
                  <span className="mt-1 text-xs text-slate-500">1 veya daha fazla dosya · .xlsx, .xls veya .csv</span>
                </>
              ) : (
                <div className="space-y-1">
                  {fileNames.map((name) => (
                    <p key={name} className="text-sm font-medium text-slate-700">{name}</p>
                  ))}
                  <p className="text-xs text-slate-400">Değiştirmek için yeni dosya seçin</p>
                </div>
              )}
            </>
          )}
          <input type="file" accept=".xlsx,.xls,.csv" multiple className="hidden"
            disabled={loading} onChange={(e) => handleFiles(e.target.files)} />
        </label>

        {/* ── Onay: Eksik Bilgili Kayıtlar ── */}
        {confirmStep === "eksik" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {eksikRows.length} kayıtta eksik bilgi var
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Mevcut bilgilerle eklensin mi, yoksa atlansın mı?
                </p>
              </div>
            </div>
            <ul className="max-h-36 overflow-y-auto space-y-1 rounded-lg bg-amber-100/60 p-2">
              {eksikRows.map((r) => (
                <li key={`${r.rowNumber}-${r.vknTckn}`} className="text-xs text-amber-800">
                  <span className="font-medium">{r.firmaAdi || r.kisaAd || "—"}</span>
                  {r.vknTckn && <span className="ml-1 font-mono text-amber-600">({r.vknTckn})</span>}
                  <span className="ml-2 text-amber-600">{r.errors.join(" · ")}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmStep("none")}>Geri</Button>
              <Button type="button" variant="outline" size="sm" onClick={handleEksikAtla}>
                Atla, sadece tamam olanları ekle
              </Button>
              <Button type="button" size="sm" loading={loading} onClick={handleEksikOnayla}>
                Evet, eksik bilgiyle de ekle ({eksikRows.length})
              </Button>
            </div>
          </div>
        )}

        {/* ── Onay: Güncellenecek Kayıtlar ── */}
        {confirmStep === "updates" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  {updateRows.length} mükellef sistemde zaten mevcut
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Bu mükelleflerin bilgileri güncellensin mi?
                </p>
              </div>
            </div>
            <ul className="max-h-36 overflow-y-auto space-y-1 rounded-lg bg-blue-100/60 p-2">
              {updateRows.map((r) => (
                <li key={r.vknTckn} className="text-xs text-blue-800">
                  <span className="font-medium">{r.firmaAdi || r.kisaAd}</span>
                  <span className="ml-1 font-mono text-blue-600">({r.vknTckn})</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmStep("none")}>Geri</Button>
              <Button type="button" variant="outline" size="sm"
                onClick={() => doImport(eksikOnaylandi, false)}>
                Sadece yeni ekle ({createRows.length + (eksikOnaylandi ? eksikRows.length : 0)})
              </Button>
              <Button type="button" size="sm" loading={loading}
                onClick={() => doImport(eksikOnaylandi, true)}>
                Evet, güncelle de ({importableRows.length})
              </Button>
            </div>
          </div>
        )}

        {/* Önizleme Tablosu */}
        {preview.length > 0 && !showingPanel && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {createRows.length > 0 && <Badge variant="success">{createRows.length} yeni</Badge>}
              {updateRows.length > 0 && <Badge variant="warning">{updateRows.length} güncellenecek</Badge>}
              {eksikRows.length > 0 && <Badge variant="warning">{eksikRows.length} eksik bilgi</Badge>}
              {invalidRows.length > 0 && <Badge variant="danger">{invalidRows.length} hatalı</Badge>}
              {gibEslesenSayisi > 0 && <Badge variant="info">{gibEslesenSayisi} GİB eşleşti</Badge>}
              {invalidRows.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => downloadImportErrors(preview)}>
                  Hataları indir
                </Button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeadCell>Firma / VKN</TableHeadCell>
                    <TableHeadCell>Durum</TableHeadCell>
                    <TableHeadCell>Not</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {preview.length === 0 ? (
                    <TableEmpty colSpan={3} />
                  ) : (
                    preview.map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.vknTckn}`}>
                        <TableCell>
                          <p className="text-xs font-medium text-slate-800 truncate max-w-[200px]">
                            {row.firmaAdi || row.kisaAd || "—"}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">{row.vknTckn || "-"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            {decisionBadge(row)}
                            {gibEslesenSayisi > 0 && row.gibEslesti && (
                              <Badge variant="info">GİB</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-normal max-w-[180px]">
                          <span className="text-xs text-slate-500 line-clamp-2">
                            {row.errors.join(" · ") || "Hazır"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Alt Butonlar */}
        {!showingPanel && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => { resetState(); onClose(); }}>İptal</Button>
            <Button
              type="button"
              loading={loading}
              disabled={importableRows.length === 0}
              onClick={handleImportClick}
            >
              İçe Aktar {importableRows.length > 0 ? `(${importableRows.length})` : ""}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
