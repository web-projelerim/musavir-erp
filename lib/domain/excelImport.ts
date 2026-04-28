"use client";

import * as XLSX from "xlsx";
import type { Musteri } from "@/lib/types";

export interface MusteriImportRow {
  rowNumber: number;
  kisaAd: string;
  firmaAdi: string;
  vknTckn: string;
  vergiDairesi: string;
  kurulusTarihi: string;
  aciklama: string;
  yetkiliAd: string;
  telefon: string;
  email: string;
  adres: string;
  sorumluPersonel: string;
  kdvMukellef: boolean;
  muhtasarMukellef: boolean;
  varsayilanHizmetUcreti?: number;
  gibKullaniciAdi?: string;
  gibParola?: string;
  gibSifre?: string;
}

export interface GibImportRow {
  rowNumber: number;
  sirket: string;
  kullaniciAdi: string;
  parola: string;
  sifre?: string;
}

export type ImportDecision = "create" | "update" | "eksik" | "skip" | "invalid";

export interface MusteriImportPreview extends MusteriImportRow {
  decision: ImportDecision;
  existingMusteriId?: string;
  errors: string[];
  gibEslesti: boolean;
}

const MUSTERI_HEADER_ALIASES: Record<
  keyof Omit<MusteriImportRow, "rowNumber" | "gibKullaniciAdi" | "gibParola" | "gibSifre">,
  string[]
> = {
  kisaAd: ["kisa ad", "kisa adi", "kisa isim", "kisaad"],
  firmaAdi: ["uzun ad", "uzun adi", "firma adi", "firma", "unvan", "musteri"],
  vknTckn: ["vkn/tckn", "vkn", "vergi no", "vergi kimlik no"],
  vergiDairesi: ["vergi dairesi", "vd", "vd adi"],
  kurulusTarihi: ["kurulus tarihi", "kurulus"],
  aciklama: ["aciklama", "notlar", "not"],
  yetkiliAd: ["yetkili", "yetkili ad", "yetkili kisi", "ad soyad"],
  telefon: ["telefon", "gsm", "cep", "phone"],
  email: ["email", "e-posta", "eposta", "mail"],
  adres: ["adres", "il ilce", "address"],
  sorumluPersonel: ["sorumlu personel", "sorumlu", "personel"],
  kdvMukellef: ["kdv", "kdv mukellef", "kdv mukellefi"],
  muhtasarMukellef: ["muhtasar", "muhtasar mukellef", "muhtasar mukellefi"],
  varsayilanHizmetUcreti: ["hizmet ucreti", "ucret", "aylik ucret", "mali musavirlik ucreti"],
};

// T.C. kimlik numarasını ayrı tut — VKN bulunamazsa fallback
const TC_ALIASES = ["tckn", "t c kimlik numarasi", "tc kimlik no", "tc kimlik numarasi", "kimlik numarasi"];

const GIB_HEADER_ALIASES: Record<keyof Omit<GibImportRow, "rowNumber">, string[]> = {
  sirket: ["sirket", "sirketi", "firma", "unvan"],
  kullaniciAdi: ["kullanici adi", "kullanici", "username", "ivd kullanici"],
  parola: ["parola", "password"],
  sifre: ["sifre", "ikinci sifre", "sifre2"],
};

// ─── Normalizasyon ──────────────────────────────────────────────────────────

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[._\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown): boolean {
  const text = normalizeHeader(value);
  return ["evet", "e", "true", "1", "var", "x"].includes(text);
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  const text = normalizeText(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : undefined;
}

// ─── Satır okuma ─────────────────────────────────────────────────────────────

/**
 * Sheet'i satır dizisi olarak okur (header:1 modunda).
 * allAliases listesindeki bir kelimeyi içeren ilk satırı başlık satırı kabul eder.
 * Böylece "MÜŞTERİ LİSTESİ" gibi başlık satırları otomatik atlanır.
 */
function sheetToObjects(
  sheet: XLSX.WorkSheet,
  allAliases: string[]
): { rows: Record<string, unknown>[]; headerRowIndex: number } {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: "", header: 1 });

  const headerRowIndex = raw.findIndex((row) =>
    (row as unknown[]).some((cell) => allAliases.includes(normalizeHeader(cell)))
  );

  if (headerRowIndex === -1) return { rows: [], headerRowIndex: -1 };

  const headers = (raw[headerRowIndex] as unknown[]).map((h) => normalizeText(h));

  const rows = raw
    .slice(headerRowIndex + 1)
    .filter((row) => (row as unknown[]).some((c) => c !== "" && c !== null && c !== undefined))
    .map((row) => {
      const arr = row as unknown[];
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = arr[i] ?? "";
      });
      return obj;
    });

  return { rows, headerRowIndex };
}

function findValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const entry = Object.entries(row).find(([header]) => aliases.includes(normalizeHeader(header)));
  return entry?.[1];
}

function findMusteriValue(row: Record<string, unknown>, field: keyof typeof MUSTERI_HEADER_ALIASES) {
  return findValue(row, MUSTERI_HEADER_ALIASES[field]);
}

function findGibValue(row: Record<string, unknown>, field: keyof typeof GIB_HEADER_ALIASES) {
  return findValue(row, GIB_HEADER_ALIASES[field]);
}

/** Önce "Vergi No" alır, boş/kısa ise "T.C. Kimlik Numarası" sütununa düşer. */
function findVknTckn(row: Record<string, unknown>): string {
  const vergiNo = normalizeText(findMusteriValue(row, "vknTckn")).replace(/\D/g, "");
  if (vergiNo.length >= 10) return vergiNo;
  const tcNo = normalizeText(findValue(row, TC_ALIASES)).replace(/\D/g, "");
  return tcNo || vergiNo;
}

// ─── Tip tespiti ─────────────────────────────────────────────────────────────

export async function detectExcelType(file: File): Promise<"musteri" | "gib"> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: "", header: 1 });
  const gibSignals = new Set(["parola", "kullanici adi", "sifre"]);

  // İlk 5 satırı kontrol et (başlık satırı nerede olursa olsun)
  for (const row of raw.slice(0, 5)) {
    const headers = (row as unknown[]).map(normalizeHeader);
    if (headers.some((h) => gibSignals.has(h))) return "gib";
  }
  return "musteri";
}

// ─── Parse fonksiyonları ─────────────────────────────────────────────────────

export async function parseMusteriExcelFile(file: File): Promise<MusteriImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const allAliases = Object.values(MUSTERI_HEADER_ALIASES).flat();
  const { rows, headerRowIndex } = sheetToObjects(sheet, allAliases);

  return rows.map((row, index) => ({
    rowNumber: headerRowIndex + index + 2,
    kisaAd: normalizeText(findMusteriValue(row, "kisaAd")),
    firmaAdi: normalizeText(findMusteriValue(row, "firmaAdi")),
    vknTckn: findVknTckn(row),
    vergiDairesi: normalizeText(findMusteriValue(row, "vergiDairesi")),
    kurulusTarihi: normalizeText(findMusteriValue(row, "kurulusTarihi")),
    aciklama: normalizeText(findMusteriValue(row, "aciklama")),
    yetkiliAd: normalizeText(findMusteriValue(row, "yetkiliAd")),
    telefon: normalizeText(findMusteriValue(row, "telefon")),
    email: normalizeText(findMusteriValue(row, "email")),
    adres: normalizeText(findMusteriValue(row, "adres")),
    sorumluPersonel: normalizeText(findMusteriValue(row, "sorumluPersonel")),
    kdvMukellef: normalizeBoolean(findMusteriValue(row, "kdvMukellef")),
    muhtasarMukellef: normalizeBoolean(findMusteriValue(row, "muhtasarMukellef")),
    varsayilanHizmetUcreti: normalizeNumber(findMusteriValue(row, "varsayilanHizmetUcreti")),
  }));
}

export async function parseGibExcelFile(file: File): Promise<GibImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const allAliases = Object.values(GIB_HEADER_ALIASES).flat();
  const { rows, headerRowIndex } = sheetToObjects(sheet, allAliases);

  return rows.map((row, index) => ({
    rowNumber: headerRowIndex + index + 2,
    sirket: normalizeText(findGibValue(row, "sirket")),
    kullaniciAdi: normalizeText(findGibValue(row, "kullaniciAdi")),
    parola: normalizeText(findGibValue(row, "parola")),
    sifre: normalizeText(findGibValue(row, "sifre")) || undefined,
  }));
}

// ─── Merge ───────────────────────────────────────────────────────────────────

function normalizeCompanyName(name: string): string {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeWithGibRows(
  musteriRows: MusteriImportRow[],
  gibRows: GibImportRow[]
): MusteriImportRow[] {
  return musteriRows.map((row) => {
    // 1. Kısa Ad = Şirket (tam eşleşme, normalize edilmiş)
    let match = row.kisaAd
      ? gibRows.find((g) => normalizeCompanyName(g.sirket) === normalizeCompanyName(row.kisaAd))
      : undefined;

    // 2. Uzun ada göre bulanık eşleşme (Kısa Ad yoksa)
    if (!match && row.firmaAdi) {
      const normFirma = normalizeCompanyName(row.firmaAdi);
      match = gibRows.find((g) => {
        const normSirket = normalizeCompanyName(g.sirket);
        return normSirket.length >= 4 && normFirma.startsWith(normSirket.slice(0, 6));
      });
    }

    if (match) {
      return {
        ...row,
        gibKullaniciAdi: match.kullaniciAdi || match.sirket,
        gibParola: match.parola,
        gibSifre: match.sifre,
      };
    }
    return row;
  });
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export function buildMusteriImportPreview(
  rows: MusteriImportRow[],
  existingMusteriler: Musteri[]
): MusteriImportPreview[] {
  const seen = new Set<string>();

  return rows.map((row) => {
    // Gerçek hatalar — kesinlikle eklenemez
    const hardErrors: string[] = [];
    // Eksik bilgiler — kullanıcı onayıyla eklenebilir
    const warnings: string[] = [];

    const displayAd = row.firmaAdi || row.kisaAd;
    const existing = existingMusteriler.find((m) => m.vknTckn === row.vknTckn);

    if (!displayAd) warnings.push("Firma adi eksik");
    if (!row.vknTckn) warnings.push("VKN/TCKN eksik");
    else if (!/^\d{10,11}$/.test(row.vknTckn)) warnings.push("VKN/TCKN 10 veya 11 haneli degil");
    if (row.vknTckn && seen.has(row.vknTckn)) hardErrors.push("Dosya icinde tekrar eden VKN/TCKN");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) warnings.push("E-posta formati hatali");
    if (row.varsayilanHizmetUcreti !== undefined && row.varsayilanHizmetUcreti < 0)
      warnings.push("Hizmet ucreti negatif");

    if (row.vknTckn) seen.add(row.vknTckn);

    const allErrors = [...hardErrors, ...warnings];
    let decision: ImportDecision;
    if (hardErrors.length > 0) decision = "invalid";
    else if (warnings.length > 0) decision = existing ? "update" : "eksik";
    else decision = existing ? "update" : "create";

    return {
      ...row,
      existingMusteriId: existing?.id,
      decision,
      errors: allErrors,
      gibEslesti: !!(row.gibKullaniciAdi && row.gibParola),
    };
  });
}

// ─── Şablon & Hata indirme ───────────────────────────────────────────────────

export function downloadMusteriImportTemplate() {
  const rows = [
    {
      "Kisa Ad": "AKD TXT",
      "Uzun Ad": "Akdeniz Tekstil Limited Sirketi",
      "Vergi No": "1234567890",
      "Vergi Dairesi": "Bagcilar",
      "T.C. Kimlik Numarasi": "",
      "Kurulus Tarihi": "2010-01-15",
      Aciklama: "Tekstil sektoru",
      "Yetkili Kisi": "Ayse Yilmaz",
      Telefon: "0532 000 0000",
      "E-posta": "ayse@ornek.com",
      Adres: "Istanbul, Kadikoy",
      "Sorumlu Personel": "",
      "KDV Mukellefi": "Evet",
      "Muhtasar Mukellefi": "Evet",
      "Hizmet Ucreti": 3500,
    },
  ];
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Musteriler");
  XLSX.writeFile(workbook, "musavir-erp-musteri-import-sablonu.xlsx");
}

export function downloadImportErrors(preview: MusteriImportPreview[]) {
  const invalidRows = preview.filter((row) => row.errors.length > 0);
  const worksheet = XLSX.utils.json_to_sheet(
    invalidRows.map((row) => ({
      Satir: row.rowNumber,
      Firma: row.firmaAdi || row.kisaAd,
      "VKN/TCKN": row.vknTckn,
      Hatalar: row.errors.join("; "),
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hatalar");
  XLSX.writeFile(workbook, "musteri-import-hatalari.xlsx");
}
