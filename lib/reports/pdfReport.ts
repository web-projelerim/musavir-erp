import jsPDF from "jspdf";
import type { Beyanname, Gorev, Musteri, Rapor, RiskSeviyesi, Tahsilat, Tebligat } from "@/lib/types";
import { formatPara, formatTarih } from "@/lib/utils/format";
import { ensureRobotoFont } from "@/lib/reports/pdfFont";

interface ReportPdfPayload {
  rapor: Rapor;
  musteri?: Musteri;
  gorevler: Gorev[];
  beyannameler: Beyanname[];
  tahsilatlar: Tahsilat[];
  tebligatlar: Tebligat[];
  risk?: {
    skor: number;
    seviye: RiskSeviyesi;
  };
}

const RAPOR_TIP_LABELS: Record<Rapor["tip"], string> = {
  gelir_gider: "Gelir-Gider Özeti",
  vergi_beyan: "Vergi ve Beyan Durumu",
  operasyon: "Operasyon Özeti",
  risk: "Risk Raporu",
};

/**
 * jsPDF'in varsayılan Helvetica fontu WinAnsiEncoding kullanır.
 * WinAnsi'de OLAN Türkçe karakterler korunur: ç, Ç, ö, Ö, ü, Ü
 * WinAnsi'de OLMAYAN Türkçe karakterler ASCII'ye çevrilir: ş→s, ğ→g, ı→i, İ→I, Ş→S, Ğ→G
 *
 * Bu yaklaşım %80 Türkçe doğruluğu sağlar (ek font yüklemeden).
 * Tam destek için ileride Roboto/Noto Sans TTF embed edilebilir.
 */
const WINANSI_TR_MAP: Record<string, string> = {
  ş: "s", Ş: "S",
  ğ: "g", Ğ: "G",
  ı: "i", İ: "I",
};

function trSafe(value: unknown): string {
  return String(value ?? "").replace(/[şŞğĞıİ]/g, (ch) => WINANSI_TR_MAP[ch] ?? ch);
}

interface ReportSection {
  title: string;
  rows: string[];
}

function buildSections(payload: ReportPdfPayload): {
  header: string[];
  metrics: Array<{ label: string; value: string }>;
  sections: ReportSection[];
} {
  const { rapor, musteri, gorevler, beyannameler, tahsilatlar, tebligatlar, risk } = payload;
  const acikGorevler = gorevler.filter((g) => g.durum !== "tamamlandi" && g.durum !== "iptal");
  const bekleyenBeyan = beyannameler.filter((b) => b.durum !== "verildi");
  const yeniTebligat = tebligatlar.filter((t) => t.durum === "yeni");
  const tahsilatToplam = tahsilatlar.reduce((s, t) => s + t.tutar, 0);
  const odenenToplam = tahsilatlar.reduce((s, t) => s + (t.durum === "odendi" ? t.tutar : t.odenenTutar ?? 0), 0);
  const tahsilatOrani = tahsilatToplam ? Math.round((odenenToplam / tahsilatToplam) * 100) : 0;

  return {
    header: [
      "MusavirERP",
      `${rapor.musteriAdi} — ${RAPOR_TIP_LABELS[rapor.tip]}`,
      `${rapor.donem} dönemi  •  Oluşturma: ${formatTarih(rapor.olusturmaTarihi)}`,
    ],
    metrics: [
      { label: "Açık görev", value: String(acikGorevler.length) },
      { label: "Bekleyen beyan", value: String(bekleyenBeyan.length) },
      { label: "Yeni tebligat", value: String(yeniTebligat.length) },
      { label: "Tahsilat oranı", value: `%${tahsilatOrani}` },
    ],
    sections: [
      {
        title: "Firma Bilgileri",
        rows: [
          `Firma: ${musteri?.firmaAdi ?? rapor.musteriAdi}`,
          `VKN/TCKN: ${musteri?.vknTckn ?? "-"}`,
          `Yetkili: ${musteri?.yetkiliAd ?? "-"}`,
          `Telefon: ${musteri?.telefon ?? "-"}`,
          `E-posta: ${musteri?.email ?? "-"}`,
          `Risk: ${risk ? `${risk.seviye} (${risk.skor}/100)` : "-"}`,
        ],
      },
      {
        title: "Görev Özeti",
        rows: gorevler.length
          ? gorevler.map((g) => `• ${g.baslik}  |  ${formatTarih(g.terminTarihi)}  |  ${g.durum}`)
          : ["Görev bulunmuyor"],
      },
      {
        title: "Beyanname Özeti",
        rows: beyannameler.length
          ? beyannameler.map((b) => `• ${b.tur} ${b.donem}  |  Son: ${formatTarih(b.sonTarih)}  |  ${b.durum}  |  ${b.vergiTutari ? formatPara(b.vergiTutari) : "-"}`)
          : ["Beyanname kaydı bulunmuyor"],
      },
      {
        title: "Tahsilat Özeti",
        rows: tahsilatlar.length
          ? tahsilatlar.map((t) => `• ${t.donem}  |  ${formatPara(t.tutar)}  |  Ödenen: ${formatPara(t.durum === "odendi" ? t.tutar : t.odenenTutar ?? 0)}  |  ${t.durum}`)
          : ["Tahsilat kaydı bulunmuyor"],
      },
      {
        title: "Tebligat Özeti",
        rows: tebligatlar.length
          ? tebligatlar.map((t) => `• ${formatTarih(t.tarih)}  |  ${t.tur}  |  ${t.baslik}  |  ${t.durum}`)
          : ["Tebligat kaydı bulunmuyor"],
      },
    ],
  };
}

export async function buildReportPdfBlob(payload: ReportPdfPayload): Promise<Blob> {
  const { header, metrics, sections } = buildSections(payload);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const useRoboto = await ensureRobotoFont(doc);
  const FONT_FAMILY = useRoboto ? "Roboto" : "helvetica";
  // Roboto kullanılıyorsa Türkçe karakter normalize etmeye gerek yok
  const safe = useRoboto ? (v: unknown) => String(v ?? "") : trSafe;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const marginBottom = 18;
  let y = 18;

  const addLine = (txt: string, fontSize: number, isBold = false, color: [number, number, number] = [30, 41, 59]) => {
    if (y + fontSize / 2 > pageH - marginBottom) {
      doc.addPage();
      y = 18;
    }
    doc.setFont(FONT_FAMILY, isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const wrapped = doc.splitTextToSize(safe(txt), pageW - marginX * 2) as string[];
    for (const w of wrapped) {
      doc.text(w, marginX, y);
      y += fontSize * 0.45 + 1;
    }
  };

  // Başlık bandı
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT_FAMILY, "bold");
  doc.setFontSize(14);
  doc.text(safe(header[0]), marginX, 9);
  doc.setFontSize(9);
  doc.setFont(FONT_FAMILY, "normal");
  doc.text(safe(header[2]), pageW - marginX, 9, { align: "right" });

  y = 24;
  addLine(header[1], 13, true);
  y += 2;

  // Metrik kutuları
  const metricBoxW = (pageW - marginX * 2 - 9) / 4;
  const metricBoxH = 16;
  metrics.forEach((m, i) => {
    const x = marginX + i * (metricBoxW + 3);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, metricBoxW, metricBoxH, 2, 2, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFont(FONT_FAMILY, "normal");
    doc.setFontSize(8);
    doc.text(safe(m.label), x + 3, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFont(FONT_FAMILY, "bold");
    doc.setFontSize(14);
    doc.text(safe(m.value), x + 3, y + 13);
  });
  y += metricBoxH + 6;

  // Bölümler
  for (const section of sections) {
    if (y + 14 > pageH - marginBottom) {
      doc.addPage();
      y = 18;
    }
    doc.setFillColor(59, 130, 246);
    doc.rect(marginX, y, pageW - marginX * 2, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(FONT_FAMILY, "bold");
    doc.setFontSize(10);
    doc.text(safe(section.title), marginX + 2, y + 4.3);
    y += 9;
    for (const row of section.rows) {
      addLine(row, 9, false, [51, 65, 85]);
    }
    y += 3;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFont(FONT_FAMILY, "normal");
    doc.setFontSize(8);
    doc.text(safe(`MusavirERP  •  ${formatTarih(new Date().toISOString())}`), marginX, pageH - 8);
    doc.text(safe(`Sayfa ${i} / ${totalPages}`), pageW - marginX, pageH - 8, { align: "right" });
  }

  const buf = doc.output("arraybuffer");
  return new Blob([buf], { type: "application/pdf" });
}

export async function buildTextPdfBlob(lines: string[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const useRoboto = await ensureRobotoFont(doc);
  const FONT_FAMILY = useRoboto ? "Roboto" : "helvetica";
  const safe = useRoboto ? (v: unknown) => String(v ?? "") : trSafe;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;
  doc.setFont(FONT_FAMILY, "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(safe(line), pageW - 30) as string[];
    for (const w of wrapped) {
      if (y > pageH - 18) {
        doc.addPage();
        y = 18;
      }
      doc.text(w, 15, y);
      y += 5;
    }
  }
  const buf = doc.output("arraybuffer");
  return new Blob([buf], { type: "application/pdf" });
}

export function buildReportPdfFileName(rapor: Rapor) {
  return `${trSafe(rapor.musteriAdi)}-${rapor.donem}-${rapor.tip}.pdf`
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\w.-]/g, "");
}

export function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
