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
    // Türkçe karakterleri ASCII'ye çevir — aksi halde "Açıklama"/"İşlem Tutarı"
    // gibi başlıklar bozulup alias eşleşmesi kaçar (banka sütunları tespit edilemez).
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // ç, ş, ğ, ö, ü ve birleşik aksan işaretleri
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ad/unvan metnini temizler (yıldız, fazla boşluk, tekrarlanan ad, uzunluk sınırı). */
function temizleAd(s: string): string {
  const ad = s.replace(/[*]/g, " ").replace(/\s+/g, " ").trim();
  // Tekrarlanan ad ("AYŞE ASLAN AYŞE ASLAN") → tek
  const words = ad.split(" ");
  if (words.length >= 2 && words.length % 2 === 0) {
    const h = words.length / 2;
    const ilk = words.slice(0, h).join(" ");
    const ikinci = words.slice(h).join(" ");
    if (ilk.toLocaleLowerCase("tr-TR") === ikinci.toLocaleLowerCase("tr-TR")) {
      return ilk.slice(0, 60);
    }
  }
  return ad.slice(0, 60);
}

/**
 * Banka açıklamasından gönderen kişi/kurum adını sezgisel çıkarır.
 * Ayrı "Gönderen" sütunu olmayan ekstrelerde (ör. Ziraat) eşleştirme için baz alınır.
 * Örnekler:
 *  "Gönd: AYŞE NUR ASLAN 0062-Türkiye Garanti..."  → "AYŞE NUR ASLAN"
 *  " FATMA GÜL ASLAN Ziraat Mobil Havale"          → "FATMA GÜL ASLAN"
 *  "AYŞE ERDANIŞMAN tarafından aktarılan ..."       → "AYŞE ERDANIŞMAN"
 */
function extractGonderen(aciklama: string): string {
  const a = aciklama.replace(/\s+/g, " ").trim();
  if (!a) return "";

  // "Gönd: <ad> 0062-..." / "Gönderen: <ad> tarafından" / "Gönd. <ad> FAST"
  let m = a.match(/g[öo]nd(?:eren)?\.?\s*:?\s+(.+?)\s+(?:\d{4}-|taraf[ıi]ndan|fast|ziraat|havale|virman|eft|swift)/i);
  if (m && m[1].trim().length >= 3) return temizleAd(m[1]);

  // "<ad> Ziraat Mobil Havale/Virman" — isim baştan
  m = a.match(/^([^0-9]+?)\s+ziraat\s+mobil/i);
  if (m && m[1].trim().length >= 3) return temizleAd(m[1]);

  // "<ad> tarafından aktarılan ..."
  m = a.match(/^([^*0-9]+?)\s+taraf[ıi]ndan\s+aktar/i);
  if (m && m[1].trim().length >= 3) return temizleAd(m[1]);

  return "";
}

/**
 * TR ve US biçimli sayıları güvenli ayrıştırır.
 * "1.234,56" (TR) → 1234.56 · "1,234.56" (US) → 1234.56 · "1234,56" → 1234.56
 * Para sembolü, boşluk, "TL" gibi ekleri temizler.
 */
function numberFrom(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let s = String(value ?? "").trim();
  if (!s) return 0;
  // Sadece rakam, ayraç ve eksi işareti kalsın (₺, TL, boşluk vb. at)
  s = s.replace(/[^\d.,\-]/g, "");
  if (!s || s === "-") return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Son görülen ayraç ondalık ayraçtır
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", "."); // TR: 1.234,56
    } else {
      s = s.replace(/,/g, ""); // US: 1,234.56
    }
  } else if (hasComma) {
    // Sadece virgül → TR ondalık ayraç kabul et (1234,56)
    s = s.replace(",", ".");
  }
  // Sadece nokta → olduğu gibi (1234.56)
  const parsed = Number(s);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Hücre tarih gibi mi görünüyor? (GG.AA.YYYY veya YYYY-AA-GG) */
function looksLikeDate(v: unknown): boolean {
  if (v instanceof Date) return true;
  const s = String(v ?? "").trim();
  return /^\d{2}[./-]\d{2}[./-]\d{4}/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s);
}

/** Hücre para tutarı gibi mi? (2 ondalık basamaklı — dekont no'dan ayırt eder) */
function looksLikeMoney(v: unknown): boolean {
  if (typeof v === "number") return true;
  const s = String(v ?? "").trim();
  return /^-?\d{1,3}([.,]\d{3})*[.,]\d{2}$/.test(s) || /^-?\d+[.,]\d{2}$/.test(s);
}

/** Hücre herhangi bir sayı mı? (gevşek — money bulunamazsa yedek) */
function looksLikeNumber(v: unknown): boolean {
  if (typeof v === "number") return true;
  const s = String(v ?? "").trim();
  return s.length > 0 && /^-?[\d.,]+$/.test(s) && /\d/.test(s);
}

/**
 * Başlık isimleri alias listesiyle eşleşmediğinde sütunları hücre içeriğinden
 * sezgisel olarak tespit eder: tarih sütunu, tutar sütunu (para biçimli) ve
 * en uzun metin sütunu (açıklama). İlk 50 veri satırı örneklenir.
 */
function detectColumnsHeuristic(dataRows: unknown[][]): {
  dateIdx: number;
  amountIdx: number;
  descIdx: number;
} {
  const colCount = dataRows.reduce((m, r) => Math.max(m, r.length), 0);
  const score = Array.from({ length: colCount }, () => ({
    date: 0,
    money: 0,
    number: 0,
    textLen: 0,
  }));
  const sample = dataRows.slice(0, 50);
  for (const row of sample) {
    for (let c = 0; c < colCount; c++) {
      const cell = row[c];
      if (cell === "" || cell == null) continue;
      if (looksLikeDate(cell)) {
        score[c].date++;
        continue;
      }
      if (looksLikeMoney(cell)) {
        score[c].money++;
        score[c].number++;
        continue;
      }
      if (looksLikeNumber(cell)) {
        score[c].number++;
        continue;
      }
      score[c].textLen += String(cell).trim().length;
    }
  }

  let dateIdx = -1;
  let amountIdx = -1;
  let descIdx = -1;
  let bestDate = 0;
  let bestMoney = 0;
  let bestNumber = 0;
  let bestText = 0;
  for (let c = 0; c < colCount; c++) {
    if (score[c].date > bestDate) {
      bestDate = score[c].date;
      dateIdx = c;
    }
    if (score[c].textLen > bestText) {
      bestText = score[c].textLen;
      descIdx = c;
    }
  }
  // Tutar sütunu: önce para-biçimli (2 ondalık) sütunları tercih et,
  // yoksa herhangi bir sayısal sütuna düş.
  for (let c = 0; c < colCount; c++) {
    if (score[c].money > bestMoney) {
      bestMoney = score[c].money;
      amountIdx = c;
    }
  }
  if (amountIdx < 0 || bestMoney === 0) {
    for (let c = 0; c < colCount; c++) {
      if (c === dateIdx) continue; // tarih sütununu tutar sanma
      if (score[c].number > bestNumber) {
        bestNumber = score[c].number;
        amountIdx = c;
      }
    }
  }
  return { dateIdx, amountIdx, descIdx };
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

/**
 * Banka hesap ekstresi PDF'lerini işlem-odaklı ayrıştırır.
 *
 * Gerçek TR banka ekstrelerinde (Vakıf, İş, Garanti, Akbank...) her işlem satırı
 * bir TARİH (ops. saatle) ile başlar ve tarihten hemen sonra gelen ilk para tutarı
 * "İşlem Tutarı"dır — sonrasındaki tutar genelde BAKİYE'dir. Bu yüzden satırdaki
 * tutarların max'ını almak (eski davranış) yanlışlıkla bakiyeyi seçiyordu.
 *
 * Kurallar:
 *  - Tarihle başlayan VE ardından para tutarı içeren satır = yeni işlem.
 *  - İşlem tutarı = tarihten sonraki İLK para token'ı (işaret korunur; "-" = çıkış).
 *  - Sadece tarih içeren üstbilgi/print-timestamp satırları ve parantezli devam
 *    satırları yeni işlem sayılmaz; devam satırları önceki işlemin açıklamasına
 *    eklenir (karşı taraf adı/IBAN yakalanır → daha iyi müşteri eşleşmesi).
 */
function parsePdfLines(lines: string[]): RawBankaSatiri[] {
  const results: RawBankaSatiri[] = [];
  // İşlem satırı başı: GG.AA.YYYY / GG/AA/YYYY / GG-AA-YYYY / YYYY-AA-GG (+ ops. saat)
  const dateAtStart = /^\s*(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}-\d{2}-\d{2})(?:[\s-]+\d{2}:\d{2}(?::\d{2})?)?/;
  // Para token'ı: TR (1.234,56) · US (1,234.56) · sade (1234,56 / 1234.56) — işaret dahil
  const moneyToken = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d{1,3}(?:,\d{3})*\.\d{2}|-?\d+[.,]\d{2}/;

  let current: RawBankaSatiri | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const startMatch = line.match(dateAtStart);
    if (startMatch) {
      const afterDate = line.slice(startMatch[0].length);
      const moneyMatch = afterDate.match(moneyToken);
      if (moneyMatch && moneyMatch.index !== undefined) {
        const tutar = numberFrom(moneyMatch[0]);
        // İşlem tutarından sonrası açıklama; hemen ardından gelen bakiye token'ını düş
        let aciklama = afterDate.slice(moneyMatch.index + moneyMatch[0].length);
        aciklama = aciklama.replace(moneyToken, ""); // bakiye sütunu
        aciklama = aciklama.replace(/\s+/g, " ").trim();
        current = {
          id: `pdf-${results.length + 1}`,
          tarih: normalizeDateStr(startMatch[1]),
          aciklama,
          tutar,
        };
        results.push(current);
        continue;
      }
    }

    // Devam satırı → önceki işlemin açıklamasına ekle
    if (current) {
      const extra = line.replace(/\s+/g, " ").trim();
      if (extra) current.aciklama = `${current.aciklama} ${extra}`.replace(/\s+/g, " ").trim();
    }
  }

  // Son rötuş: açıklamayı kısalt, gönderen adını çıkar, olası dekont no'yu yakala
  for (const r of results) {
    r.aciklama = r.aciklama.slice(0, 300).trim();
    r.gonderen = extractGonderen(r.aciklama);
    const dekontMatch = r.aciklama.match(/\b\d{8,}\b/);
    if (dekontMatch) r.dekontNo = dekontMatch[0];
  }

  return results.filter((r) => r.tutar !== 0 || r.aciklama.length > 1);
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

  // Taranmış/görüntü tabanlı PDF'lerde metin katmanı yoktur (ör. bazı Ziraat
  // ekstreleri tek bir görüntü olarak gelir). Bu durumda hiçbir satır çıkmaz.
  if (allLines.length === 0) {
    throw new Error(
      "Bu PDF taranmış görüntü içeriyor (metin katmanı yok), otomatik okunamıyor. " +
        "Ekstreyi Excel/CSV olarak indirip yükleyin ya da satırları manuel ekleyin."
    );
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
  if (aoa.length === 0) return [];

  const headerIdx = detectHeaderRow(aoa);
  const headerRow = (aoa[headerIdx] ?? []).map((h) => String(h ?? "").trim());
  const dataRows = aoa.slice(headerIdx + 1);

  // Sütun indeksleri: önce başlık isminden (alias), bulunamazsa içerik-sezgisel
  const colByAlias = (aliases: string[]) =>
    headerRow.findIndex((h) => headerMatch(h, aliases));

  let tarihIdx = colByAlias(TARIH_ALIASES);
  const alacakIdx = colByAlias(ALACAK_ALIASES);
  let tutarIdx = colByAlias(TUTAR_ALIASES);
  let aciklamaIdx = colByAlias(ACIKLAMA_ALIASES);
  const gonderenIdx = colByAlias(GONDEREN_ALIASES);
  const ibanIdx = colByAlias(IBAN_ALIASES);
  const dekontIdx = colByAlias(DEKONT_ALIASES);

  // Başlık eşleşmesi eksikse (banka logosu/farklı isimlendirme) sezgisel tespite düş.
  // Bu, "0 satır okundu / Kaydet butonu pasif" hatasının kök çözümü.
  const heur = detectColumnsHeuristic(dataRows);
  if (tarihIdx < 0) tarihIdx = heur.dateIdx;
  if (aciklamaIdx < 0) aciklamaIdx = heur.descIdx;
  if (alacakIdx < 0 && tutarIdx < 0) tutarIdx = heur.amountIdx;

  const cell = (arr: unknown[], idx: number) => (idx >= 0 ? arr[idx] : undefined);

  return dataRows
    .map((arr, index) => {
      const dateValue = cell(arr, tarihIdx);
      const date =
        dateValue instanceof Date
          ? dateValue.toISOString().slice(0, 10)
          : normalizeDateStr(String(dateValue || "").trim().slice(0, 10));

      // Alacak (gelen para) sütunu varsa onu, yoksa genel tutar sütununu kullan
      const tutar = numberFrom(cell(arr, alacakIdx)) || numberFrom(cell(arr, tutarIdx));

      const aciklama = String(cell(arr, aciklamaIdx) ?? "").trim();
      // Ayrı gönderen sütunu varsa onu, yoksa açıklamadan çıkarılan adı baz al
      const gonderen = String(cell(arr, gonderenIdx) ?? "").trim() || extractGonderen(aciklama);

      return {
        id: `row-${index + 1}`,
        tarih: date,
        aciklama,
        tutar: Math.abs(tutar),
        gonderen,
        iban: String(cell(arr, ibanIdx) ?? "").trim(),
        dekontNo: String(cell(arr, dekontIdx) ?? "").trim(),
      };
    })
    // Anlamlı veri içeren satırları tut (tutar VEYA açıklama/gönderen metni)
    .filter((row) => row.tutar > 0 || row.aciklama.length > 1 || row.gonderen.length > 1);
}

function scoreMusteri(raw: RawBankaSatiri, musteri: Musteri) {
  const haystack = normalize(`${raw.aciklama} ${raw.gonderen} ${raw.iban}`);
  const firma = normalize(musteri.firmaAdi);
  const yetkili = normalize(musteri.yetkiliAd);
  let score = 0;

  if (musteri.vknTckn && haystack.includes(musteri.vknTckn)) score += 70;
  if (firma && haystack.includes(firma)) score += 45;

  // Kişi (yetkili) adı — gönderen çoğu zaman firma değil kişi adıdır (şahıs
  // mükellef / şirket ortağı havalesi). Tam ad geçmese de isim kelimeleri
  // örtüşüyorsa orta güvenli eşleşme say. Orta-güvenliler onay bekleyene düşüp
  // mali müşavir onayına sunulduğu için bu esnetme güvenlidir.
  if (yetkili && haystack.includes(yetkili)) {
    score += 30;
  } else if (yetkili) {
    const yetkiliWords = yetkili.split(" ").filter((word) => word.length > 2);
    const isabet = yetkiliWords.filter((word) => haystack.includes(word)).length;
    if (isabet >= 2) score += 24;
    else if (isabet === 1) score += 10;
  }

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
