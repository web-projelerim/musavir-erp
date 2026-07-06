/**
 * pdfjs-dist'in worker dosyasını public/'a kopyalar.
 *
 * jsPDF/pdf.js sürüm ile worker script'i eşleşmezse tarayıcıda sert bir hata
 * fırlatır (banka ekstresi PDF yükleme akışı bu yüzden sessizce bozuluyordu —
 * bkz. BankaHizmetEkstresiModal.tsx). npm install/güncelleme sonrası worker'ın
 * her zaman yüklü pdfjs-dist sürümüyle senkron kalması için bu script
 * postinstall'da otomatik çalışır.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

try {
  fs.copyFileSync(src, dest);
  console.log("[sync-pdf-worker] public/pdf.worker.min.mjs güncellendi.");
} catch (err) {
  console.warn("[sync-pdf-worker] Kopyalama başarısız (pdfjs-dist henüz yüklü değil olabilir):", err.message);
}
