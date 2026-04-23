"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeadCell, TableRow } from "@/components/ui/Table";
import { useAppData } from "@/lib/hooks/useAppData";
import { useAuditLog } from "@/lib/hooks/useAuditLog";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { createBankaEkstresi, createOdeme, updateTahakkukDurum } from "@/lib/firebase/repositories";
import { matchBankaSatirlari, parseBankaEkstresiFile } from "@/lib/domain/bankaEsleme";
import { getOfisId } from "@/lib/domain/office";
import type { BankaEkstreSatiri } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function periodFromDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function BankaEkstresiModal({ open, onClose }: Props) {
  const { musteriler, tahakkuklar } = useAppData();
  const { user } = useAuth();
  const toast = useToast();
  const logAudit = useAuditLog();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BankaEkstreSatiri[]>([]);
  const [loading, setLoading] = useState(false);

  const matched = rows.filter((row) => row.durum === "eslesti");
  const pending = rows.filter((row) => row.durum === "onay_bekliyor");
  const unmatched = rows.filter((row) => row.durum === "eslesmedi");

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const rawRows = await parseBankaEkstresiFile(file);
      setRows(matchBankaSatirlari(rawRows, musteriler, tahakkuklar));
      setFileName(file.name);
    } catch (error) {
      console.error(error);
      toast.error("Banka ekstresi okunamadi");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      if (isFirebaseConfigured) {
        const ekstre = await createBankaEkstresi({
          ofisId: getOfisId(user?.ofisId),
          dosyaAdi: fileName,
          donem: periodFromDate(),
          satirSayisi: rows.length,
          eslesenSayisi: matched.length,
          onayBekleyenSayisi: pending.length,
          eslesmeyenSayisi: unmatched.length,
          duplicateSayisi: rows.filter((row) => row.uyarilar?.some((u) => u.includes("dekont"))).length,
          satirlar: rows,
          createdBy: user?.id ?? "system",
        });

        for (const row of matched) {
          await createOdeme({
            ofisId: getOfisId(user?.ofisId),
            musteriId: row.musteriId,
            musteriAdi: row.musteriAdi,
            tahakkukId: row.tahakkukId,
            tutar: row.tutar,
            odemeTarihi: row.tarih,
            bankaAciklamasi: row.aciklama,
            iban: row.iban,
            dekontNo: row.dekontNo,
            eslesmeSkoru: row.eslesmeSkoru,
            durum: "eslesti",
            kaynak: "banka",
            ekstreId: ekstre.id,
          });
          const tahakkuk = tahakkuklar.find((t) => t.id === row.tahakkukId);
          if (tahakkuk) {
            const paid = (tahakkuk.odenenTutar ?? 0) + row.tutar;
            await updateTahakkukDurum(tahakkuk.id, paid >= tahakkuk.tutar ? "odendi" : "kismi", paid);
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await logAudit({
        action: "match",
        entityType: "banka_ekstresi",
        entityId: fileName || `ekstre-${Date.now()}`,
        entityLabel: fileName,
        summary: `${matched.length} banka hareketi otomatik eslesti, ${unmatched.length} eslesmedi`,
        after: { matched: matched.length, pending: pending.length, unmatched: unmatched.length },
      });
      toast.success("Banka ekstresi islendi", `${matched.length} otomatik eslesme kaydedildi`);
      setRows([]);
      setFileName("");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Ekstre kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Banka Ekstresi Yukle" size="xl">
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-blue-300 hover:bg-blue-50/40">
          <Upload className="mb-2 h-6 w-6 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{fileName || "Banka ekstresi secin"}</span>
          <span className="mt-1 text-xs text-slate-500">Alanlar: tarih, aciklama, tutar, gonderen, IBAN, dekont no</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{matched.length} eslesen</Badge>
              <Badge variant="warning">{pending.length} onay bekleyen</Badge>
              <Badge variant="danger">{unmatched.length} eslesmeyen</Badge>
            </div>
            {unmatched.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Bankada gorunen ancak musterilerle eslesmeyen hareketler var. Kayit sonrasi bu satirlar uyarida kalir.
              </div>
            )}
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeadCell>Tarih</TableHeadCell>
                    <TableHeadCell>Aciklama</TableHeadCell>
                    <TableHeadCell>Tutar</TableHeadCell>
                    <TableHeadCell>Eslesme</TableHeadCell>
                    <TableHeadCell>Skor</TableHeadCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableEmpty colSpan={5} />
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell><span className="text-xs text-slate-600">{row.tarih}</span></TableCell>
                        <TableCell className="whitespace-normal"><span className="text-xs text-slate-700">{row.aciklama}</span></TableCell>
                        <TableCell><span className="text-xs font-semibold text-slate-900">{row.tutar.toLocaleString("tr-TR")} TL</span></TableCell>
                        <TableCell>
                          <div>
                            <Badge variant={row.durum === "eslesti" ? "success" : row.durum === "onay_bekliyor" ? "warning" : "danger"}>
                              {row.durum === "eslesti" ? row.musteriAdi : row.durum === "onay_bekliyor" ? row.musteriAdi : "Eslesmedi"}
                            </Badge>
                            {row.uyarilar?.[0] && <p className="mt-1 text-xs text-slate-500">{row.uyarilar[0]}</p>}
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs text-slate-600">{row.eslesmeSkoru ?? 0}</span></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Iptal</Button>
          <Button type="button" loading={loading} disabled={rows.length === 0} onClick={handleSave}>
            Eslesmeleri Kaydet
          </Button>
        </div>
      </div>
    </Modal>
  );
}
