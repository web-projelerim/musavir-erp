/**
 * Luca Mahsup Fişi CSV Export
 *
 * Tahakkukları Luca muhasebe yazılımının beklediği formata dönüştürür.
 * Kullanıcı bu CSV'yi Luca'da "Mahsup Fişi → İçe Aktar" ile yükleyebilir.
 *
 * Kolonlar: Tarih | Belge No | Hesap Kodu | Açıklama | Borç | Alacak
 */

import type { Tahakkuk, Musteri } from "@/lib/types";

export interface LucaFisKalemi {
  tarih: string;        // DD.MM.YYYY
  belgeNo: string;
  hesapKodu: string;
  aciklama: string;
  borc: number;
  alacak: number;
}

const HESAP_KODLARI: Record<string, string> = {
  // Vergi tahakkukları
  KDV: "360.01",
  MUHTASAR: "360.02",
  GECICI_VERGI: "360.03",
  KURUM: "360.04",
  GELIR: "360.05",
  // Hizmet tahakkukları
  mali_musavirlik: "320.01",
  beyanname: "320.02",
  danismanlik: "320.03",
  diger: "320.09",
};

function formatTarihLuca(isoStr: string): string {
  const d = new Date(isoStr);
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const yil = d.getFullYear();
  return `${gun}.${ay}.${yil}`;
}

function csvSatir(kolonlar: (string | number)[]): string {
  return kolonlar
    .map((k) => {
      const str = String(k);
      // Virgül, tırnak veya satır sonu içeriyorsa tırnak içine al
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

export function tahakkuklariLucaCSVOlustur(
  tahakkuklar: Tahakkuk[],
  musteriler: Musteri[]
): string {
  const baslik = csvSatir([
    "Tarih",
    "Belge No",
    "Hesap Kodu",
    "Açıklama",
    "Borç",
    "Alacak",
  ]);

  const satirlar = tahakkuklar.map((t, i): string => {
    const musteri = musteriler.find((m) => m.id === t.musteriId);
    const musteriAdi = musteri?.firmaAdi ?? t.musteriId;
    const vkn = musteri?.vknTckn ?? "";

    const hesapKodu =
      t.tahakkukTuru === "vergi"
        ? (HESAP_KODLARI[t.vergiTuru ?? ""] ?? "360.09")
        : (HESAP_KODLARI[t.hizmetTuru ?? ""] ?? "320.09");

    const aciklama =
      t.tahakkukTuru === "vergi"
        ? `${t.vergiTuru ?? "Vergi"} - ${musteriAdi} (${vkn}) - ${t.donem ?? ""}`
        : `Mali Müşavirlik Hizmeti - ${musteriAdi} (${vkn}) - ${t.donem ?? ""}`;

    const belgeNo = `TAH-${String(i + 1).padStart(4, "0")}`;
    const tarih = formatTarihLuca(t.vadeTarihi);

    // Vergi = Borç hesabı, Hizmet = Alacak
    const borc = t.tahakkukTuru === "vergi" ? t.tutar : 0;
    const alacak = t.tahakkukTuru === "hizmet" ? t.tutar : 0;

    return csvSatir([tarih, belgeNo, hesapKodu, aciklama, borc, alacak]);
  });

  return [baslik, ...satirlar].join("\n");
}

export function lucaCSVIndir(
  tahakkuklar: Tahakkuk[],
  musteriler: Musteri[],
  donem?: string
): void {
  const csvIcerik = tahakkuklariLucaCSVOlustur(tahakkuklar, musteriler);
  const bom = "﻿"; // UTF-8 BOM — Excel'in Türkçe karakterleri doğru okuması için
  const blob = new Blob([bom + csvIcerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `luca-mahsup-${donem ?? new Date().toISOString().slice(0, 7)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
