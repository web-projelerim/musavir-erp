import { maskVknTckn } from "@/lib/utils/maskData";
import type { Tebligat } from "@/lib/types";
import { formatTarih } from "@/lib/utils/format";
import { buildTextPdfBlob } from "@/lib/reports/pdfReport";

export function buildTebligatPdfBlob(tebligat: Tebligat, maskVkn = false): Promise<Blob> {
  return buildTextPdfBlob([
    "MusavirERP",
    "E-Tebligat Dokumu",
    "",
    `Musteri: ${tebligat.musteriAdi}`,
    `VKN/TCKN: ${maskVkn ? maskVknTckn(tebligat.vknTckn) : tebligat.vknTckn}`,
    `Tarih: ${formatTarih(tebligat.tarih)}`,
    `Tur: ${tebligat.tur}`,
    `Durum: ${tebligat.durum}`,
    "",
    "Baslik",
    tebligat.baslik,
    "",
    "Notlar",
    tebligat.notlar || "-",
    "",
    "Bu dokum, GIB PDF referansi bulunmadigi durumlarda MusavirERP icinde olusturulan takip nushasidir.",
  ]);
}

export function tebligatPdfFileName(tebligat: Tebligat) {
  return `${tebligat.musteriAdi}-${tebligat.tarih}-${tebligat.id}.pdf`
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\w.-]/g, "");
}
