"use client";

import * as XLSX from "xlsx";
import type { Musteri } from "@/lib/types";

export interface MusteriImportRow {
  rowNumber: number;
  firmaAdi: string;
  vknTckn: string;
  yetkiliAd: string;
  telefon: string;
  email: string;
  adres: string;
  sorumluPersonel: string;
  kdvMukellef: boolean;
  muhtasarMukellef: boolean;
  varsayilanHizmetUcreti?: number;
}

export type ImportDecision = "create" | "update" | "skip" | "invalid";

export interface MusteriImportPreview extends MusteriImportRow {
  decision: ImportDecision;
  existingMusteriId?: string;
  errors: string[];
}

const HEADER_ALIASES: Record<keyof Omit<MusteriImportRow, "rowNumber">, string[]> = {
  firmaAdi: ["firma adi", "firma", "unvan", "sirket", "musteri"],
  vknTckn: ["vkn/tckn", "vkn", "tckn", "vergi no", "vergi kimlik no"],
  yetkiliAd: ["yetkili", "yetkili ad", "yetkili kisi", "ad soyad"],
  telefon: ["telefon", "gsm", "cep", "phone"],
  email: ["email", "e-posta", "eposta", "mail"],
  adres: ["adres", "il ilce", "address"],
  sorumluPersonel: ["sorumlu personel", "sorumlu", "personel"],
  kdvMukellef: ["kdv", "kdv mukellef", "kdv mukellefi"],
  muhtasarMukellef: ["muhtasar", "muhtasar mukellef", "muhtasar mukellefi"],
  varsayilanHizmetUcreti: ["hizmet ucreti", "ucret", "aylik ucret", "mali musavirlik ucreti"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown) {
  const text = normalizeHeader(value);
  return ["evet", "e", "true", "1", "var", "x"].includes(text);
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return value;
  const text = normalizeText(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findValue(row: Record<string, unknown>, field: keyof Omit<MusteriImportRow, "rowNumber">) {
  const aliases = HEADER_ALIASES[field];
  const entry = Object.entries(row).find(([header]) => aliases.includes(normalizeHeader(header)));
  return entry?.[1];
}

export async function parseMusteriExcelFile(file: File): Promise<MusteriImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    firmaAdi: normalizeText(findValue(row, "firmaAdi")),
    vknTckn: normalizeText(findValue(row, "vknTckn")).replace(/\D/g, ""),
    yetkiliAd: normalizeText(findValue(row, "yetkiliAd")),
    telefon: normalizeText(findValue(row, "telefon")),
    email: normalizeText(findValue(row, "email")),
    adres: normalizeText(findValue(row, "adres")),
    sorumluPersonel: normalizeText(findValue(row, "sorumluPersonel")) || "Selin Kaya",
    kdvMukellef: normalizeBoolean(findValue(row, "kdvMukellef")),
    muhtasarMukellef: normalizeBoolean(findValue(row, "muhtasarMukellef")),
    varsayilanHizmetUcreti: normalizeNumber(findValue(row, "varsayilanHizmetUcreti")),
  }));
}

export function buildMusteriImportPreview(
  rows: MusteriImportRow[],
  existingMusteriler: Musteri[]
): MusteriImportPreview[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const errors: string[] = [];
    const existing = existingMusteriler.find((m) => m.vknTckn === row.vknTckn);

    if (!row.firmaAdi) errors.push("Firma adi zorunlu");
    if (!/^\d{10,11}$/.test(row.vknTckn)) errors.push("VKN/TCKN 10 veya 11 haneli olmali");
    if (seen.has(row.vknTckn)) errors.push("Dosya icinde tekrar eden VKN/TCKN");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("E-posta formati hatali");
    if (row.varsayilanHizmetUcreti !== undefined && row.varsayilanHizmetUcreti < 0) {
      errors.push("Hizmet ucreti negatif olamaz");
    }

    seen.add(row.vknTckn);

    return {
      ...row,
      existingMusteriId: existing?.id,
      decision: errors.length > 0 ? "invalid" : existing ? "update" : "create",
      errors,
    };
  });
}

export function downloadMusteriImportTemplate() {
  const rows = [
    {
      "Firma Adi": "Ornek Tekstil Ltd. Sti.",
      "VKN/TCKN": "1234567890",
      "Yetkili Kisi": "Ayse Yilmaz",
      Telefon: "0532 000 0000",
      "E-posta": "ayse@ornek.com",
      Adres: "Istanbul, Kadikoy",
      "Sorumlu Personel": "Selin Kaya",
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
      Firma: row.firmaAdi,
      "VKN/TCKN": row.vknTckn,
      Hatalar: row.errors.join("; "),
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hatalar");
  XLSX.writeFile(workbook, "musteri-import-hatalari.xlsx");
}
