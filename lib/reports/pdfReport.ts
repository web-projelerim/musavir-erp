import type { Beyanname, Gorev, Musteri, Rapor, RiskSeviyesi, Tahsilat, Tebligat } from "@/lib/types";
import { formatPara, formatTarih } from "@/lib/utils/format";

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
  gelir_gider: "Gelir - Gider Ozeti",
  vergi_beyan: "Vergi ve Beyan Durumu",
  operasyon: "Operasyon Ozeti",
  risk: "Risk Raporu",
};

const TURKISH_CHARS: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

function ascii(value: unknown) {
  return String(value ?? "")
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => TURKISH_CHARS[char] ?? char)
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function escapePdf(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapLine(line: string, maxLength = 92) {
  const words = line.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      return;
    }
    current = next;
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function section(title: string) {
  return ["", ascii(title).toUpperCase()];
}

function buildLines(payload: ReportPdfPayload) {
  const { rapor, musteri, gorevler, beyannameler, tahsilatlar, tebligatlar, risk } = payload;
  const acikGorevler = gorevler.filter((gorev) => gorev.durum !== "tamamlandi" && gorev.durum !== "iptal");
  const bekleyenBeyan = beyannameler.filter((beyan) => beyan.durum !== "verildi");
  const yeniTebligat = tebligatlar.filter((tebligat) => tebligat.durum === "yeni");
  const tahsilatToplam = tahsilatlar.reduce((sum, tahsilat) => sum + tahsilat.tutar, 0);
  const odenenToplam = tahsilatlar.reduce((sum, tahsilat) => {
    if (tahsilat.durum === "odendi") return sum + tahsilat.tutar;
    return sum + (tahsilat.odenenTutar ?? 0);
  }, 0);

  const lines = [
    "MusavirERP",
    `${rapor.musteriAdi} - ${RAPOR_TIP_LABELS[rapor.tip]}`,
    `${rapor.donem} donemi | Olusturma: ${formatTarih(rapor.olusturmaTarihi)}`,
    "",
    `Acik gorev: ${acikGorevler.length}`,
    `Bekleyen beyan: ${bekleyenBeyan.length}`,
    `Yeni tebligat: ${yeniTebligat.length}`,
    `Tahsilat orani: %${tahsilatToplam ? Math.round((odenenToplam / tahsilatToplam) * 100) : 0}`,
    ...section("Firma Bilgileri"),
    `Firma: ${musteri?.firmaAdi ?? rapor.musteriAdi}`,
    `VKN/TCKN: ${musteri?.vknTckn ?? "-"}`,
    `Yetkili: ${musteri?.yetkiliAd ?? "-"}`,
    `Telefon: ${musteri?.telefon ?? "-"}`,
    `E-posta: ${musteri?.email ?? "-"}`,
    `Risk: ${risk ? `${risk.seviye} (${risk.skor}/100)` : "-"}`,
    ...section("Gorev Ozeti"),
    ...(gorevler.length
      ? gorevler.map((gorev) => `${gorev.baslik} | ${gorev.atananKisi} | ${formatTarih(gorev.terminTarihi)} | ${gorev.durum}`)
      : ["Gorev bulunmuyor"]),
    ...section("Beyanname Ozeti"),
    ...(beyannameler.length
      ? beyannameler.map((beyan) => `${beyan.tur} | ${beyan.donem} | Son: ${formatTarih(beyan.sonTarih)} | ${beyan.durum} | ${beyan.vergiTutari ? formatPara(beyan.vergiTutari) : "-"}`)
      : ["Beyanname kaydi bulunmuyor"]),
    ...section("Tahsilat Ozeti"),
    ...(tahsilatlar.length
      ? tahsilatlar.map((tahsilat) => `${tahsilat.donem} | ${formatPara(tahsilat.tutar)} | Odenen: ${formatPara(tahsilat.durum === "odendi" ? tahsilat.tutar : tahsilat.odenenTutar ?? 0)} | ${tahsilat.durum}`)
      : ["Tahsilat kaydi bulunmuyor"]),
    ...section("Tebligat Ozeti"),
    ...(tebligatlar.length
      ? tebligatlar.map((tebligat) => `${formatTarih(tebligat.tarih)} | ${tebligat.tur} | ${tebligat.baslik} | ${tebligat.durum}`)
      : ["Tebligat kaydi bulunmuyor"]),
  ];

  return lines.flatMap((line) => wrapLine(ascii(line)));
}

function buildContentStream(lines: string[]) {
  const commands = [
    "BT",
    "/F1 10 Tf",
    "14 TL",
    "50 800 Td",
    ...lines.map((line) => `(${escapePdf(line)}) Tj T*`),
    "ET",
  ];
  return commands.join("\n");
}

function chunkLines(lines: string[], perPage = 52) {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage));
  }
  return pages.length ? pages : [[""]];
}

function buildPdfString(pages: string[][]) {
  const fontId = pages.length * 2 + 3;
  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = buildContentStream(pageLines);
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontId - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export function buildTextPdfBlob(lines: string[]) {
  const pages = chunkLines(lines.flatMap((line) => wrapLine(ascii(line))));
  return new Blob([buildPdfString(pages)], { type: "application/pdf" });
}

export function buildReportPdfBlob(payload: ReportPdfPayload) {
  return buildTextPdfBlob(buildLines(payload));
}

export function buildReportPdfFileName(rapor: Rapor) {
  return `${rapor.musteriAdi}-${rapor.donem}-${rapor.tip}.pdf`
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
