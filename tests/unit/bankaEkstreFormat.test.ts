import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseBankaEkstresiFile } from "@/lib/domain/bankaEsleme";

/**
 * Banka ekstresi format toleransı.
 *
 * Kök neden (regresyon): Excel'in GERÇEK tarih hücreleri raw:false ile hücrenin
 * biçimine göre metne dönüyordu ("7/13/26") ve tanınmıyordu → gerçek ekstre
 * "banka ekstresi gibi görünmüyor" diye reddediliyordu. Ayrıca tek haneli gün/ay,
 * 2 haneli yıl ve "1.500,00 TL" gibi para birimi ekleri de tanınmıyordu.
 *
 * Koruma korunmalı: gerçekten ekstre olmayan dosya HÂLÂ reddedilmeli.
 */

function xlsxFile(rows: unknown[][], name = "ekstre.xlsx") {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const ekstre = (tarih: unknown, tutar: unknown, baslik = "Tutar"): unknown[][] => [
  ["Tarih", "Açıklama", baslik],
  [tarih, "AYSE ASLAN havale", tutar],
];

describe("parseBankaEkstresiFile — tarih biçimi toleransı", () => {
  it("gerçek Excel tarih hücresini okur ve günü kaydırmaz (asıl regresyon)", async () => {
    // Excel tarih hücresi raw:false ile "7/13/26" olur; ayrıca toISOString
    // UTC'ye kaydırıp 12 Temmuz yazabilirdi — ikisi de olmamalı.
    const rows = await parseBankaEkstresiFile(xlsxFile(ekstre(new Date(2026, 6, 13), 1500)));
    expect(rows).toHaveLength(1);
    expect(rows[0].tarih).toBe("2026-07-13");
    expect(rows[0].tutar).toBe(1500);
  });

  it.each([
    ["13.07.2026", "2026-07-13", "GG.AA.YYYY"],
    ["1.7.2026", "2026-07-01", "tek haneli gün/ay"],
    ["13.07.26", "2026-07-13", "2 haneli yıl"],
    ["13.07.2026 14:32", "2026-07-13", "tarih + saat"],
    ["2026-07-13", "2026-07-13", "YYYY-AA-GG"],
    ["2026/07/13", "2026-07-13", "YYYY/AA/GG"],
    ["13-07-2026", "2026-07-13", "tire ayraçlı"],
  ])("metin tarihi %s → %s (%s)", async (girdi, beklenen) => {
    const rows = await parseBankaEkstresiFile(xlsxFile(ekstre(girdi, "1.500,00")));
    expect(rows).toHaveLength(1);
    expect(rows[0].tarih).toBe(beklenen);
  });
});

describe("parseBankaEkstresiFile — tutar biçimi toleransı", () => {
  it.each([
    ["1.500,00", 1500],
    ["1.500,00 TL", 1500],
    ["₺1.500,00", 1500],
    ["1,500.50", 1500.5],
    ["1500", 1500],
  ])("tutar %s → %d", async (girdi, beklenen) => {
    const rows = await parseBankaEkstresiFile(xlsxFile(ekstre("13.07.2026", girdi)));
    expect(rows).toHaveLength(1);
    expect(rows[0].tutar).toBe(beklenen);
  });

  it("ayrı Alacak sütununu tutar olarak alır", async () => {
    const rows = await parseBankaEkstresiFile(
      xlsxFile([
        ["İşlem Tarihi", "Açıklama", "Borç", "Alacak", "Bakiye"],
        ["13.07.2026", "AYSE ASLAN havale", "", "1.500,00", "12.500,00"],
      ])
    );
    expect(rows[0].tutar).toBe(1500);
  });
});

describe("parseBankaEkstresiFile — başlık tespiti", () => {
  it("üstteki banka metadata satırlarını atlayıp gerçek başlığı bulur", async () => {
    const rows = await parseBankaEkstresiFile(
      xlsxFile([
        ["ZIRAAT BANKASI", "", ""],
        ["Hesap: TR12 0001 0000 0000 0000 0000 01", "", ""],
        ["Tarih", "Açıklama", "Tutar"],
        ["13.07.2026", "AYSE ASLAN havale", "1.500,00"],
      ])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tarih).toBe("2026-07-13");
  });
});

describe("parseBankaEkstresiFile — koruma korunuyor", () => {
  it("ekstre olmayan dosyayı reddeder ve eksik sütunu söyler", async () => {
    const file = xlsxFile(
      [
        ["Satir", "Hatalar"],
        [8, "Firma/kisi adi ve VKN/TCKN yok - ice aktarilamaz"],
        [9, "Firma/kisi adi ve VKN/TCKN yok - ice aktarilamaz"],
      ],
      "musteri-import-hatalari.xlsx"
    );
    await expect(parseBankaEkstresiFile(file)).rejects.toThrow(/banka ekstresi gibi görünmüyor/);
    await expect(parseBankaEkstresiFile(file)).rejects.toThrow(/tarih/);
  });
});
