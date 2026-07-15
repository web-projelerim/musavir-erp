import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { matchBankaSatirlari, parseBankaEkstresiFile, type RawBankaSatiri } from "@/lib/domain/bankaEsleme";
import type { Musteri, Tahakkuk } from "@/lib/types";

function raw(p: Partial<RawBankaSatiri>): RawBankaSatiri {
  return { id: "r1", tarih: "2026-07-13", aciklama: "", tutar: 1000, ...p };
}

function musteri(p: Partial<Musteri>): Musteri {
  return { id: "m1", ofisId: "o1", firmaAdi: "", vknTckn: "", yetkiliAd: "", durum: "aktif", ...p } as Musteri;
}

function hizmetTahakkuk(p: Partial<Tahakkuk>): Tahakkuk {
  return {
    id: "t1",
    ofisId: "o1",
    musteriId: "m1",
    tahakkukTuru: "hizmet",
    hizmetTuru: "mali_musavirlik",
    tutar: 1000,
    vadeTarihi: "2026-07-01",
    donem: "2026-07",
    durum: "bekliyor",
    otomatikTuretilmis: false,
    bildirimDurumu: "beklemede",
    musteriAdi: "Aslan Gıda",
    ...p,
  } as Tahakkuk;
}

function xlsxFile(rows: unknown[][], name = "ekstre.xlsx") {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("matchBankaSatirlari — kişi adı eşleşmesi", () => {
  it("gönderen kişi adı yetkili adıyla KISMEN örtüşünce eşleşmedi yerine onay bekliyor olur", () => {
    const m = [musteri({ id: "mx", firmaAdi: "Aslan Gıda", yetkiliAd: "Ayşe Nur Aslan" })];
    const t = [hizmetTahakkuk({ musteriId: "mx" })];
    // Gönderen "AYŞE ASLAN" tam ad değil; hizmet sinyali "musavirlik" var
    const [row] = matchBankaSatirlari(
      [raw({ gonderen: "AYŞE ASLAN", aciklama: "AYŞE ASLAN musavirlik ucreti" })],
      m,
      t
    );
    expect(row.durum).not.toBe("eslesmedi");
    expect(row.musteriId).toBe("mx");
  });

  it("hiç isim örtüşmesi yoksa eşleşmedi kalır (yanlış eşleşme üretmez)", () => {
    const m = [musteri({ id: "mx", firmaAdi: "Ali Veli Ltd", yetkiliAd: "Ali Veli" })];
    const t = [hizmetTahakkuk({ musteriId: "mx" })];
    const [row] = matchBankaSatirlari(
      [raw({ gonderen: "Mehmet Kaya", aciklama: "Mehmet Kaya havale" })],
      m,
      t
    );
    expect(row.durum).toBe("eslesmedi");
    expect(row.musteriId).toBeUndefined();
  });
});

describe("parseBankaEkstresiFile", () => {
  it("musteri import hata dosyasini banka ekstresi gibi yorumlamaz", async () => {
    const file = xlsxFile(
      [
        ["Satir", "Hatalar"],
        [8, "Firma/kisi adi ve VKN/TCKN yok - ice aktarilamaz"],
        [9, "Firma/kisi adi ve VKN/TCKN yok - ice aktarilamaz"],
      ],
      "musteri-import-hatalari.xlsx"
    );

    await expect(parseBankaEkstresiFile(file)).rejects.toThrow("banka ekstresi gibi");
  });

  it("tarih aciklama ve alacak kolonlari olan banka ekstresini okur", async () => {
    const file = xlsxFile([
      ["Banka raporu"],
      ["Tarih", "Aciklama", "Alacak"],
      ["14.07.2026", "AYSE ASLAN mali musavirlik ucreti", "1.250,00"],
    ]);

    const rows = await parseBankaEkstresiFile(file);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tarih: "2026-07-14",
      aciklama: "AYSE ASLAN mali musavirlik ucreti",
      tutar: 1250,
    });
  });
});
