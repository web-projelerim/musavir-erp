"use client";

import * as XLSX from "xlsx";
import type { BankaEkstreSatiri, Musteri, Tahakkuk } from "@/lib/types";
import { hizmetTuruLabel, tahakkukKalemLabel, vergiTuruLabel } from "@/lib/domain/tahakkuk";

export interface RawBankaSatiri {
  id: string;
  tarih: string;
  aciklama: string;
  tutar: number;
  gonderen?: string;
  iban?: string;
  dekontNo?: string;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberFrom(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function get(row: Record<string, unknown>, aliases: string[]) {
  const found = Object.entries(row).find(([key]) => aliases.includes(normalize(key)));
  return found?.[1];
}

function normalizeDateStr(raw: string): string {
  const dmy = raw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // YYYY/MM/DD veya YYYY.MM.DD
  const ymd = raw.match(/^(\d{4})[./-](\d{2})[./-](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  return new Date().toISOString().slice(0, 10);
}

function parsePdfLines(lines: string[]): RawBankaSatiri[] {
  const results: RawBankaSatiri[] = [];
  // Tarih: GG.AA.YYYY, GG/AA/YYYY, GG-AA-YYYY veya YYYY-AA-GG
  const dateRe = /(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}-\d{2}-\d{2})/;
  // Tutar: TR formatı (1.234,56) veya US formatı (1,234.56) veya sade (1234,56 / 1234.56)
  const amountReTR = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
  const amountReUS = /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/g;
  const amountReSade = /\b(\d+[.,]\d{2})\b/g;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;

    // Önce TR formatını dene, yoksa US, yoksa sade
    let amountMatches = Array.from(line.matchAll(amountReTR));
    if (amountMatches.length === 0) amountMatches = Array.from(line.matchAll(amountReUS));
    if (amountMatches.length === 0) amountMatches = Array.from(line.matchAll(amountReSade));

    const amounts = amountMatches.map((m) => numberFrom(m[1]));
    const tutar = amounts.length > 0 ? Math.max(...amounts) : 0;

    // Açıklama: tarih ve tüm tutar eşleşmeleri çıkarıldıktan sonra kalan
    let aciklama = line.replace(dateRe, "");
    for (const m of amountMatches) {
      aciklama = aciklama.replace(m[0], "");
    }
    aciklama = aciklama.replace(/\s+/g, " ").trim();

    // Tutar 0 olsa bile satırı tut (kullanıcı manuel düzeltebilir),
    // ancak en azından açıklama veya tutar olmalı
    if (tutar <= 0 && !aciklama) continue;

    // Olası dekont numarası: 6+ haneli rakam dizisi (tarih ve tutar dışında)
    const dekontMatch = aciklama.match(/\b\d{6,}\b/);

    results.push({
      id: `pdf-${results.length + 1}`,
      tarih: normalizeDateStr(dateMatch[1]),
      aciklama,
      tutar,
      dekontNo: dekontMatch?.[0],
    });
  }
  return results;
}

async function parseBankaPdfFile(file: File): Promise<RawBankaSatiri[]> {
  const pdfjsLib = await import("pdfjs-dist");
  // Worker'ı /public klasöründen yerel olarak sun (CDN bağımlılığı yok)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Her PDF metin öğesinin y-koordinatına göre gruplandır → görsel satırları yeniden oluştur
    type PdfTextItem = { str: string; transform: number[] };
    const yMap = new Map<number, { x: number; str: string }[]>();

    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const { str, transform } = item as PdfTextItem;
      if (!str.trim()) continue;
      // transform[5] = y, transform[4] = x (PDF koordinat sistemi)
      const y = Math.round(transform[5]);
      const x = transform[4];
      if (!yMap.has(y)) yMap.set(y, []);
      yMap.get(y)!.push({ x, str });
    }

    // PDF'de y=0 sayfanın altı, büyük y yukarı → azalan sırayla sırala
    const sortedYs = Array.from(yMap.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = yMap
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .trim();
      if (line) allLines.push(line);
    }
  }

  return parsePdfLines(allLines);
}

const TARIH_ALIASES = [
  "tarih", "islem tarihi", "odeme tarihi", "date",
  "val tarihi", "valor tarihi", "islem tarih",
  "gerceklesme tarihi", "transfer tarihi", "valor",
  "islem zamani", "vade tarihi", "kayit tarihi",
];
const ALACAK_ALIASES = ["alacak", "alacak tutari", "kredi", "credit", "gelen", "gelir"];
const TUTAR_ALIASES = [
  "tutar", "amount", "islem tutari", "tutar tl",
  "islem miktari", "miktar", "miktar tl", "bakiye degisimi",
];
const ACIKLAMA_ALIASES = [
  "aciklama", "islem aciklamasi", "description",
  "islem detayi", "aciklama detayi", "karsi taraf",
  "detay", "islem bilgisi", "aciklama bilgisi",
  "islem tipi", "islem turu", "konu",
];
const GONDEREN_ALIASES = [
  "gonderen", "ad soyad", "unvan", "sender",
  "gonderen adi", "gonderen unvani", "karsi hesap sahibi",
  "alici gonderici", "islem yapan", "karsi taraf adi",
];
const IBAN_ALIASES = ["iban", "gonderen iban", "karsi hesap iban", "hesap no", "karsi iban"];
const DEKONT_ALIASES = [
  "dekont no", "referans", "reference",
  "islem no", "referans no", "dekont numarasi",
  "islem referansi", "makbuz no", "transaction id",
];

/** Header alias listesi içeren string mi? */
function headerMatch(key: string, aliases: string[]): boolean {
  return aliases.includes(normalize(key));
}

/**
 * Excel'in ilk birkaç satırı genelde banka logosu/metadata içerir.
 * Gerçek başlık satırını bulmak için ilk 30 satırı tara: en çok bilinen başlığı
 * içeren satırı header kabul et.
 */
function detectHeaderRow(aoa: unknown[][]): number {
  let bestRow = 0;
  let bestScore = -1;
  const maxScan = Math.min(aoa.length, 30);
  for (let i = 0; i < maxScan; i++) {
    const row = aoa[i] ?? [];
    let score = 0;
    for (const cell of row) {
      const s = normalize(cell);
      if (!s) continue;
      if (headerMatch(s, TARIH_ALIASES)) score += 3;
      if (headerMatch(s, ALACAK_ALIASES)) score += 3;
      if (headerMatch(s, TUTAR_ALIASES)) score += 2;
      if (headerMatch(s, ACIKLAMA_ALIASES)) score += 2;
      if (headerMatch(s, GONDEREN_ALIASES)) score += 1;
      if (headerMatch(s, IBAN_ALIASES)) score += 1;
      if (headerMatch(s, DEKONT_ALIASES)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestScore >= 3 ? bestRow : 0;
}

export async function parseBankaEkstresiFile(file: File): Promise<RawBankaSatiri[]> {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    return parseBankaPdfFile(file);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Önce raw 2D array olarak oku, başlık satırını dinamik tespit et
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerIdx = detectHeaderRow(aoa);
  const headerRow = (aoa[headerIdx] ?? []).map((h) => String(h ?? "").trim());
  const dataRows = aoa.slice(headerIdx + 1);

  const objectRows = dataRows.map((arr) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const key = headerRow[i];
      if (!key) continue;
      obj[key] = arr[i];
    }
    return obj;
  });

  return objectRows
    .map((row, index) => {
      const dateValue = get(row, TARIH_ALIASES);
      const date =
        dateValue instanceof Date
          ? dateValue.toISOString().slice(0, 10)
          : normalizeDateStr(String(dateValue || "").trim().slice(0, 10));

      const alacakVal = get(row, ALACAK_ALIASES);
      const tutarVal = get(row, TUTAR_ALIASES);
      const tutar = numberFrom(alacakVal) || numberFrom(tutarVal);

      return {
        id: `row-${index + 1}`,
        tarih: date,
        aciklama: String(get(row, ACIKLAMA_ALIASES) ?? "").trim(),
        tutar,
        gonderen: String(get(row, GONDEREN_ALIASES) ?? "").trim(),
        iban: String(get(row, IBAN_ALIASES) ?? "").trim(),
        dekontNo: String(get(row, DEKONT_ALIASES) ?? "").trim(),
      };
    })
    .filter((row) => row.tutar > 0 || row.aciklama || row.gonderen);
}

function scoreMusteri(raw: RawBankaSatiri, musteri: Musteri) {
  const haystack = normalize(`${raw.aciklama} ${raw.gonderen} ${raw.iban}`);
  const firma = normalize(musteri.firmaAdi);
  const yetkili = normalize(musteri.yetkiliAd);
  let score = 0;

  if (musteri.vknTckn && haystack.includes(musteri.vknTckn)) score += 70;
  if (firma && haystack.includes(firma)) score += 45;
  if (yetkili && haystack.includes(yetkili)) score += 30;

  const firmaWords = firma.split(" ").filter((word) => word.length > 2);
  score += firmaWords.filter((word) => haystack.includes(word)).length * 8;

  if (musteri.bankaGonderenAdlari) {
    for (const ad of musteri.bankaGonderenAdlari) {
      if (haystack.includes(normalize(ad))) score += 60;
    }
  }

  return Math.min(score, 100);
}

function inferOdemeSinifi(raw: RawBankaSatiri): BankaEkstreSatiri["odemeSinifi"] {
  const haystack = normalize(`${raw.aciklama} ${raw.gonderen} ${raw.iban} ${raw.dekontNo}`);
  if (/kdv|muhtasar|gecici|kurumlar|gelir|damga|sgk|vergi|gib|tahakkuk fi|tf /.test(haystack)) {
    return "vergi";
  }
  if (/musavirlik|muhasebe|defter|hizmet bedeli|ucret|danismanlik|aylik hizmet/.test(haystack)) {
    return "hizmet";
  }
  return "belirsiz";
}

function scoreTahakkukTipUyumu(raw: RawBankaSatiri, tahakkuk: Tahakkuk) {
  const sinif = inferOdemeSinifi(raw);
  if (sinif === "belirsiz") return 0;
  return sinif === tahakkuk.tahakkukTuru ? 28 : -22;
}

function scoreTahakkukKalemi(raw: RawBankaSatiri, tahakkuk: Tahakkuk) {
  const haystack = normalize(`${raw.aciklama} ${raw.gonderen} ${raw.dekontNo}`);
  const kalem = normalize(tahakkukKalemLabel(tahakkuk));
  let score = 0;

  if (tahakkuk.resmiTahakkukFisNo && haystack.includes(normalize(tahakkuk.resmiTahakkukFisNo))) score += 40;
  if (kalem && haystack.includes(kalem)) score += 20;
  if (tahakkuk.tahakkukTuru === "vergi") {
    const vergiEtiketi = normalize(vergiTuruLabel(tahakkuk.vergiTuru));
    if (vergiEtiketi && haystack.includes(vergiEtiketi)) score += 12;
  } else {
    const hizmetEtiketi = normalize(hizmetTuruLabel(tahakkuk.hizmetTuru));
    if (hizmetEtiketi && haystack.includes(hizmetEtiketi)) score += 8;
  }

  return score;
}

function scoreTahakkuk(raw: RawBankaSatiri, tahakkuk: Tahakkuk) {
  // Tutar eşleştirme kriteri olarak kullanılmaz — sadece isim/tip/kalem bazlı eşleşme
  return scoreTahakkukTipUyumu(raw, tahakkuk) + scoreTahakkukKalemi(raw, tahakkuk);
}

export function matchBankaSatirlari(
  rows: RawBankaSatiri[],
  musteriler: Musteri[],
  tahakkuklar: Tahakkuk[]
): BankaEkstreSatiri[] {
  const usedDekont = new Set<string>();

  return rows.map((raw) => {
    const odemeSinifi = inferOdemeSinifi(raw);
    const candidates = musteriler
      .map((musteri) => {
        const musteriTahakkuklari = tahakkuklar.filter(
          (t) => t.musteriId === musteri.id && t.durum !== "odendi" && t.durum !== "iptal"
        );
        const bestTahakkuk = musteriTahakkuklari
          .map((tahakkuk) => ({ tahakkuk, score: scoreTahakkuk(raw, tahakkuk) }))
          .sort((a, b) => b.score - a.score)[0];

        return {
          musteri,
          tahakkuk: bestTahakkuk?.tahakkuk,
          score: scoreMusteri(raw, musteri) + (bestTahakkuk?.score ?? 0),
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const duplicate = Boolean(raw.dekontNo && usedDekont.has(raw.dekontNo));
    if (raw.dekontNo) usedDekont.add(raw.dekontNo);

    const score = Math.min(best?.score ?? 0, 100);
    const durum = duplicate ? "onay_bekliyor" : score >= 85 ? "eslesti" : score >= 55 ? "onay_bekliyor" : "eslesmedi";
    const uyarilar: string[] = [];
    if (duplicate) uyarilar.push("Ayni dekont/referans daha once dosyada var");
    if (odemeSinifi === "vergi") uyarilar.push("Satir vergi odemesi gibi gorunuyor");
    if (odemeSinifi === "hizmet") uyarilar.push("Satir hizmet odemesi gibi gorunuyor");
    if (durum === "eslesmedi") uyarilar.push("Musteri ile guvenli eslesme bulunamadi");
    if (durum === "onay_bekliyor") uyarilar.push("Dusuk/orta guvenli eslesme mali musavir onayi bekliyor");

    return {
      id: raw.id,
      tarih: raw.tarih,
      aciklama: raw.aciklama,
      tutar: raw.tutar,
      gonderen: raw.gonderen,
      iban: raw.iban,
      dekontNo: raw.dekontNo,
      musteriId: durum === "eslesmedi" ? undefined : best?.musteri.id,
      musteriAdi: durum === "eslesmedi" ? undefined : best?.musteri.firmaAdi,
      tahakkukId: durum === "eslesmedi" ? undefined : best?.tahakkuk?.id,
      tahakkukTuru: durum === "eslesmedi" ? undefined : best?.tahakkuk?.tahakkukTuru,
      odemeSinifi,
      eslesenTahakkukEtiketi: durum === "eslesmedi" ? undefined : best?.tahakkuk ? tahakkukKalemLabel(best.tahakkuk) : undefined,
      eslesmeSkoru: score,
      durum,
      uyarilar,
    };
  });
}
