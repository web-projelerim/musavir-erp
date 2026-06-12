/**
 * jsPDF için Roboto TTF font yükleyici.
 *
 * Roboto ş, ğ, ı, İ dahil tüm Türkçe karakterleri destekler.
 *
 * Kullanım:
 *   import { ensureRobotoFont } from "@/lib/reports/pdfFont";
 *   await ensureRobotoFont(doc);
 *   doc.setFont("Roboto", "normal");
 *
 * TTF dosyası /public/fonts/Roboto-Regular.ttf konumundan yüklenir.
 * Dosya yoksa Helvetica fallback yapılır (uyarı log'lanır).
 *
 * Roboto TTF'i Google Fonts'tan ücretsiz indirebilirsiniz:
 *   https://fonts.google.com/specimen/Roboto
 *   → "Get font" → "Download all" → Roboto-Regular.ttf dosyasını /public/fonts/ altına koyun
 */

import type jsPDF from "jspdf";

let cachedBase64: string | null = null;
let cacheFailed = false;

async function fetchRobotoBase64(): Promise<string | null> {
  if (cachedBase64) return cachedBase64;
  if (cacheFailed) return null;

  try {
    const res = await fetch("/fonts/Roboto-Regular.ttf");
    if (!res.ok) {
      console.warn("[PDF Font] Roboto-Regular.ttf bulunamadı. /public/fonts/ altına ekleyin. Helvetica fallback.");
      cacheFailed = true;
      return null;
    }
    const buf = await res.arrayBuffer();
    // Büyük binary'yi parça parça encode et (call stack overflow olmasın diye)
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      let s = "";
      for (let j = 0; j < sub.length; j++) s += String.fromCharCode(sub[j]);
      binary += s;
    }
    cachedBase64 = btoa(binary);
    return cachedBase64;
  } catch (err) {
    console.warn("[PDF Font] Roboto yüklenemedi:", err);
    cacheFailed = true;
    return null;
  }
}

/**
 * Verilen jsPDF instance'ına Roboto fontunu ekler.
 * Roboto yoksa false döner — çağıran taraf Helvetica + trSafe fallback'e geçebilir.
 */
export async function ensureRobotoFont(doc: jsPDF): Promise<boolean> {
  const base64 = await fetchRobotoBase64();
  if (!base64) return false;
  try {
    doc.addFileToVFS("Roboto-Regular.ttf", base64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    // Bold için aynı font'u referansla (yeterli)
    doc.addFont("Roboto-Regular.ttf", "Roboto", "bold");
    return true;
  } catch (err) {
    console.warn("[PDF Font] Roboto kaydedilemedi:", err);
    return false;
  }
}
