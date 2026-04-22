import type { Beyanname, Gorev, Musteri, Rapor, RiskSeviyesi, Tahsilat, Tebligat } from "@/lib/types";
import { formatPara, formatTarih } from "@/lib/utils/format";

const RAPOR_TIP_LABELS: Record<Rapor["tip"], string> = {
  gelir_gider: "Gelir - Gider Ozeti",
  vergi_beyan: "Vergi ve Beyan Durumu",
  operasyon: "Operasyon Ozeti",
  risk: "Risk Raporu",
};

interface PrintableReportPayload {
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function row(label: string, value: unknown) {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "-")}</td></tr>`;
}

function simpleRows<T>(items: T[], render: (item: T) => string, emptyLabel: string) {
  if (items.length === 0) {
    return `<tr><td colspan="5" class="muted">${escapeHtml(emptyLabel)}</td></tr>`;
  }
  return items.map(render).join("");
}

export function buildPrintableReportHtml(payload: PrintableReportPayload) {
  const { rapor, musteri, gorevler, beyannameler, tahsilatlar, tebligatlar, risk } = payload;
  const acikGorevler = gorevler.filter((gorev) => gorev.durum !== "tamamlandi" && gorev.durum !== "iptal");
  const gecikenTahsilat = tahsilatlar.filter((tahsilat) => tahsilat.durum === "gecikti");
  const bekleyenBeyan = beyannameler.filter((beyan) => beyan.durum !== "verildi");
  const yeniTebligat = tebligatlar.filter((tebligat) => tebligat.durum === "yeni");
  const tahsilatToplam = tahsilatlar.reduce((sum, tahsilat) => sum + tahsilat.tutar, 0);
  const odenenToplam = tahsilatlar.reduce((sum, tahsilat) => {
    if (tahsilat.durum === "odendi") return sum + tahsilat.tutar;
    return sum + (tahsilat.odenenTutar ?? 0);
  }, 0);

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(rapor.musteriAdi)} - ${escapeHtml(RAPOR_TIP_LABELS[rapor.tip])}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; line-height: 1.45; }
    header { border-bottom: 2px solid #2563eb; padding-bottom: 18px; margin-bottom: 22px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    h2 { font-size: 15px; margin: 24px 0 10px; }
    .muted { color: #64748b; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
    .metric { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .metric strong { display: block; font-size: 20px; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; font-weight: 700; }
    .info th { width: 190px; }
    footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    @media print {
      body { margin: 18mm; }
      button { display: none; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <header>
    <p class="muted">MusavirERP</p>
    <h1>${escapeHtml(rapor.musteriAdi)} - ${escapeHtml(RAPOR_TIP_LABELS[rapor.tip])}</h1>
    <p class="muted">${escapeHtml(rapor.donem)} donemi | Olusturma: ${escapeHtml(formatTarih(rapor.olusturmaTarihi))}</p>
  </header>

  <section class="meta">
    <div class="metric"><span>Acik gorev</span><strong>${acikGorevler.length}</strong></div>
    <div class="metric"><span>Bekleyen beyan</span><strong>${bekleyenBeyan.length}</strong></div>
    <div class="metric"><span>Yeni tebligat</span><strong>${yeniTebligat.length}</strong></div>
    <div class="metric"><span>Tahsilat orani</span><strong>%${tahsilatToplam ? Math.round((odenenToplam / tahsilatToplam) * 100) : 0}</strong></div>
  </section>

  <h2>Firma Bilgileri</h2>
  <table class="info">
    ${row("Firma", musteri?.firmaAdi ?? rapor.musteriAdi)}
    ${row("VKN/TCKN", musteri?.vknTckn)}
    ${row("Yetkili", musteri?.yetkiliAd)}
    ${row("Telefon", musteri?.telefon)}
    ${row("E-posta", musteri?.email)}
    ${row("Risk Seviyesi", risk ? `${risk.seviye} (${risk.skor}/100)` : "-")}
  </table>

  <h2>Gorev Ozeti</h2>
  <table>
    <thead><tr><th>Baslik</th><th>Atanan</th><th>Termin</th><th>Oncelik</th><th>Durum</th></tr></thead>
    <tbody>
      ${simpleRows(
        gorevler,
        (gorev) => `<tr><td>${escapeHtml(gorev.baslik)}</td><td>${escapeHtml(gorev.atananKisi)}</td><td>${escapeHtml(formatTarih(gorev.terminTarihi))}</td><td>${escapeHtml(gorev.oncelik)}</td><td>${escapeHtml(gorev.durum)}</td></tr>`,
        "Gorev bulunmuyor"
      )}
    </tbody>
  </table>

  <h2>Beyanname Ozeti</h2>
  <table>
    <thead><tr><th>Tur</th><th>Donem</th><th>Son Tarih</th><th>Vergi</th><th>Durum</th></tr></thead>
    <tbody>
      ${simpleRows(
        beyannameler,
        (beyan) => `<tr><td>${escapeHtml(beyan.tur)}</td><td>${escapeHtml(beyan.donem)}</td><td>${escapeHtml(formatTarih(beyan.sonTarih))}</td><td>${escapeHtml(beyan.vergiTutari ? formatPara(beyan.vergiTutari) : "-")}</td><td>${escapeHtml(beyan.durum)}</td></tr>`,
        "Beyanname kaydi bulunmuyor"
      )}
    </tbody>
  </table>

  <h2>Tahsilat Ozeti</h2>
  <table>
    <thead><tr><th>Donem</th><th>Tutar</th><th>Odenen</th><th>Vade</th><th>Durum</th></tr></thead>
    <tbody>
      ${simpleRows(
        tahsilatlar,
        (tahsilat) => `<tr><td>${escapeHtml(tahsilat.donem)}</td><td>${escapeHtml(formatPara(tahsilat.tutar))}</td><td>${escapeHtml(formatPara(tahsilat.durum === "odendi" ? tahsilat.tutar : tahsilat.odenenTutar ?? 0))}</td><td>${escapeHtml(formatTarih(tahsilat.vadeTarihi))}</td><td>${escapeHtml(tahsilat.durum)}</td></tr>`,
        "Tahsilat kaydi bulunmuyor"
      )}
    </tbody>
  </table>

  <h2>Tebligat Ozeti</h2>
  <table>
    <thead><tr><th>Tarih</th><th>Baslik</th><th>Tur</th><th>Durum</th><th>Not</th></tr></thead>
    <tbody>
      ${simpleRows(
        tebligatlar,
        (tebligat) => `<tr><td>${escapeHtml(formatTarih(tebligat.tarih))}</td><td>${escapeHtml(tebligat.baslik)}</td><td>${escapeHtml(tebligat.tur)}</td><td>${escapeHtml(tebligat.durum)}</td><td>${escapeHtml(tebligat.notlar ?? "-")}</td></tr>`,
        "Tebligat kaydi bulunmuyor"
      )}
    </tbody>
  </table>

  <footer>
    Bu rapor MusavirERP tarafindan olusturulmustur. Yazdir penceresinde "PDF olarak kaydet" secenegi ile PDF dosyasi alinabilir.
  </footer>
</body>
</html>`;
}

export function openPrintableReport(payload: PrintableReportPayload) {
  const html = buildPrintableReportHtml(payload);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");

  if (!popup) {
    downloadReportHtml(payload.rapor, html);
    return false;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 350);
  return true;
}

export function downloadReportHtml(rapor: Rapor, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${rapor.musteriAdi}-${rapor.donem}-${rapor.tip}.html`
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\w.-]/g, "");
  link.click();
  URL.revokeObjectURL(url);
}
