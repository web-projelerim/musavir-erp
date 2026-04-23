"use client";

import * as XLSX from "xlsx";
import type { BankaEkstreSatiri, Musteri, Tahakkuk } from "@/lib/types";

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

export async function parseBankaEkstresiFile(file: File): Promise<RawBankaSatiri[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows
    .map((row, index) => {
      const dateValue = get(row, ["tarih", "islem tarihi", "odeme tarihi", "date"]);
      const date =
        dateValue instanceof Date
          ? dateValue.toISOString().slice(0, 10)
          : String(dateValue || new Date().toISOString().slice(0, 10)).slice(0, 10);

      return {
        id: `row-${index + 1}`,
        tarih: date,
        aciklama: String(get(row, ["aciklama", "islem aciklamasi", "description"]) ?? ""),
        tutar: numberFrom(get(row, ["tutar", "alacak", "amount", "islem tutari"])),
        gonderen: String(get(row, ["gonderen", "ad soyad", "unvan", "sender"]) ?? ""),
        iban: String(get(row, ["iban"]) ?? ""),
        dekontNo: String(get(row, ["dekont no", "referans", "reference"]) ?? ""),
      };
    })
    .filter((row) => row.tutar > 0 || row.aciklama);
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

  return Math.min(score, 100);
}

function scoreTahakkuk(raw: RawBankaSatiri, tahakkuk: Tahakkuk) {
  const kalan = Math.max(0, tahakkuk.tutar - (tahakkuk.odenenTutar ?? 0));
  if (raw.tutar === tahakkuk.tutar || raw.tutar === kalan) return 25;
  if (raw.tutar > 0 && Math.abs(raw.tutar - kalan) <= 5) return 18;
  if (raw.tutar > 0 && raw.tutar < kalan) return 10;
  return 0;
}

export function matchBankaSatirlari(
  rows: RawBankaSatiri[],
  musteriler: Musteri[],
  tahakkuklar: Tahakkuk[]
): BankaEkstreSatiri[] {
  const usedDekont = new Set<string>();

  return rows.map((raw) => {
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
      eslesmeSkoru: score,
      durum,
      uyarilar,
    };
  });
}
