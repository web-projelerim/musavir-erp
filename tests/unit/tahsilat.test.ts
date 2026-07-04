import { describe, expect, it } from "vitest";
import {
  genelBakiyeOzeti,
  kalanBakiye,
  kismiOdemeUygula,
  musteriBakiyeOzeti,
  odenenTutari,
} from "@/lib/domain/tahsilat";
import type { Tahsilat } from "@/lib/types";

function t(over: Partial<Tahsilat>): Tahsilat {
  return {
    id: "t1",
    musteriId: "m1",
    musteriAdi: "Firma A",
    tutar: 1000,
    donem: "2026-06",
    vadeTarihi: "2026-06-26",
    durum: "bekliyor",
    ...over,
  };
}

describe("odenenTutari / kalanBakiye", () => {
  it("odendi durumunda tamamı ödenmiş sayılır (odenenTutar boş olsa da)", () => {
    const x = t({ durum: "odendi" });
    expect(odenenTutari(x)).toBe(1000);
    expect(kalanBakiye(x)).toBe(0);
  });

  it("kismi ödemede odenenTutar esas alınır", () => {
    const x = t({ durum: "kismi", odenenTutar: 400 });
    expect(odenenTutari(x)).toBe(400);
    expect(kalanBakiye(x)).toBe(600);
  });

  it("odenenTutar tutarı aşarsa tutara sabitlenir (negatif bakiye yok)", () => {
    const x = t({ durum: "kismi", odenenTutar: 1500 });
    expect(odenenTutari(x)).toBe(1000);
    expect(kalanBakiye(x)).toBe(0);
  });

  it("bekliyor durumunda kalan = tutar", () => {
    expect(kalanBakiye(t({}))).toBe(1000);
  });
});

describe("musteriBakiyeOzeti", () => {
  it("müşteri bazında toplar ve kalanı büyükten küçüğe sıralar", () => {
    const liste = [
      t({ id: "a", musteriId: "m1", musteriAdi: "A", tutar: 1000, durum: "bekliyor" }),
      t({ id: "b", musteriId: "m1", musteriAdi: "A", tutar: 500, durum: "odendi" }),
      t({ id: "c", musteriId: "m2", musteriAdi: "B", tutar: 3000, durum: "kismi", odenenTutar: 500 }),
    ];
    const ozet = musteriBakiyeOzeti(liste);
    expect(ozet).toHaveLength(2);
    expect(ozet[0].musteriId).toBe("m2"); // kalan 2500 > 1000
    expect(ozet[0].kalan).toBe(2500);
    expect(ozet[1].kalan).toBe(1000);
    expect(ozet[1].toplamTutar).toBe(1500);
    expect(ozet[1].odenen).toBe(500);
  });

  it("en eski ödenmemiş vadeyi bulur (ödenmişler hariç)", () => {
    const liste = [
      t({ id: "a", vadeTarihi: "2026-01-10", durum: "odendi" }),
      t({ id: "b", vadeTarihi: "2026-03-05", durum: "bekliyor" }),
      t({ id: "c", vadeTarihi: "2026-02-01", durum: "gecikti" }),
    ];
    const ozet = musteriBakiyeOzeti(liste);
    expect(ozet[0].enEskiVade).toBe("2026-02-01");
    expect(ozet[0].gecikenSayisi).toBe(1);
  });
});

describe("genelBakiyeOzeti", () => {
  it("toplam/tahsil/kalan/geciken hesaplar", () => {
    const liste = [
      t({ id: "a", tutar: 1000, durum: "odendi" }),
      t({ id: "b", tutar: 2000, durum: "gecikti" }),
      t({ id: "c", tutar: 3000, durum: "kismi", odenenTutar: 1000 }),
    ];
    const g = genelBakiyeOzeti(liste);
    expect(g.toplamAlacak).toBe(6000);
    expect(g.tahsilEdilen).toBe(2000);
    expect(g.kalanBakiye).toBe(4000);
    expect(g.gecikenTutar).toBe(2000);
    expect(g.gecikenSayisi).toBe(1);
  });
});

describe("kismiOdemeUygula", () => {
  it("kısmen ödeme durumu kismi yapar", () => {
    const sonuc = kismiOdemeUygula(t({}), 300);
    expect(sonuc.durum).toBe("kismi");
    expect(sonuc.odenenTutar).toBe(300);
    expect(sonuc.odemeTarihi).toBeUndefined();
  });

  it("mevcut kısmi ödemenin üstüne ekler", () => {
    const sonuc = kismiOdemeUygula(t({ durum: "kismi", odenenTutar: 400 }), 200);
    expect(sonuc.odenenTutar).toBe(600);
    expect(sonuc.durum).toBe("kismi");
  });

  it("toplam tutara ulaşınca odendi olur ve odemeTarihi atanır", () => {
    const sonuc = kismiOdemeUygula(t({ durum: "kismi", odenenTutar: 800 }), 200);
    expect(sonuc.durum).toBe("odendi");
    expect(sonuc.odenenTutar).toBe(1000);
    expect(sonuc.odemeTarihi).toBeTruthy();
  });

  it("fazla ödeme tutara sabitlenir; negatif ödeme yok sayılır", () => {
    expect(kismiOdemeUygula(t({}), 5000).odenenTutar).toBe(1000);
    expect(kismiOdemeUygula(t({ durum: "kismi", odenenTutar: 100 }), -50).odenenTutar).toBe(100);
  });
});
