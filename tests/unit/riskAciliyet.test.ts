import { describe, expect, it } from "vitest";
import { hesaplaMusteriRisk } from "@/lib/domain/risk";
import type { Beyanname, Musteri, Tahakkuk, Tebligat } from "@/lib/types";

function musteri(id: string): Musteri {
  return { id, firmaAdi: `Firma ${id}`, gecikmisPesinat: false } as unknown as Musteri;
}

function tahakkuk(musteriId: string, gunSonra: number): Tahakkuk {
  const d = new Date();
  d.setDate(d.getDate() + gunSonra);
  return {
    id: `tk-${musteriId}-${gunSonra}-${Math.random()}`,
    musteriId,
    durum: "bekliyor",
    tutar: 1000,
    vadeTarihi: d.toISOString(),
  } as unknown as Tahakkuk;
}

function isoGunSonra(gunSonra: number) {
  const d = new Date();
  d.setDate(d.getDate() + gunSonra);
  return d.toISOString();
}

function beyanname(musteriId: string, gunSonra: number): Beyanname {
  return {
    id: `bey-${musteriId}-${gunSonra}-${Math.random()}`,
    musteriId,
    musteriAdi: musteriId,
    tur: "KDV",
    donem: "2026-01",
    sonTarih: isoGunSonra(gunSonra),
    durum: "bekliyor",
  } as unknown as Beyanname;
}

function tebligat(musteriId: string, gunSonra: number, karsit: boolean): Tebligat {
  return {
    id: `teb-${musteriId}-${gunSonra}-${Math.random()}`,
    musteriId,
    musteriAdi: musteriId,
    vknTckn: "1111111111",
    tarih: new Date().toISOString(),
    baslik: karsit ? "Karşıt İnceleme Tutanağı" : "Bilgi İsteme Yazısı",
    tur: karsit ? "Karşıt İnceleme" : "Bilgi",
    durum: "bekliyor",
    kritikSonTarih: isoGunSonra(gunSonra),
  } as unknown as Tebligat;
}

const bosInput = { tebligatlar: [], beyannameler: [], gorevler: [], tahsilatlar: [], kdv2: [] };

describe("risk — tahakkuk vade aciliyeti", () => {
  it("yarın vadesi dolan tek tahakkuk, 1 ay sonrası 5 tahakkuktan daha yüksek risk üretir", () => {
    // A: tek tahakkuk, vade yarın
    const a = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("A"),
      tahakkuklar: [tahakkuk("A", 1)],
    });
    // B: 5 tahakkuk, vade 30 gün sonra
    const b = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("B"),
      tahakkuklar: [1, 2, 3, 4, 5].map(() => tahakkuk("B", 30)),
    });

    expect(a.skor).toBeGreaterThan(b.skor);
    expect(a.seviye).toBe("yuksek"); // ~50 puan
    expect(b.skor).toBe(0); // 30 gün → aciliyet 0
    expect(a.sinyaller.some((s) => s.tip === "yaklasan_vade")).toBe(true);
  });

  it("vadesi geçmiş ödenmemiş tahakkuk gecikmiş sinyali üretir", () => {
    const r = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("C"),
      tahakkuklar: [tahakkuk("C", -5)], // 5 gün önce vade doldu
    });
    expect(r.sinyaller.some((s) => s.tip === "gecikmis_tahakkuk")).toBe(true);
    expect(r.skor).toBeGreaterThan(0);
  });
});

describe("risk — tebligat / karşıt inceleme aciliyeti", () => {
  it("1 gün kalan beyanname, 3 gün kalan karşıt incelemeden daha riskli olur", () => {
    // A: beyanname yarın bitiyor
    const a = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("A"),
      beyannameler: [beyanname("A", 1)],
    });
    // B: karşıt inceleme tutanağının yanıt süresi 3 gün sonra doluyor
    const b = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("B"),
      tebligatlar: [tebligat("B", 3, true)],
    });

    expect(b.sinyaller.some((s) => s.tip === "karsit_inceleme")).toBe(true);
    expect(b.skor).toBeGreaterThan(0);
    expect(a.skor).toBeGreaterThan(b.skor);
  });

  it("süresi geçmiş bir tebligat yanıtı 'gecikmis_tebligat_yaniti' sinyali üretir", () => {
    const r = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("D"),
      tebligatlar: [tebligat("D", -2, true)], // yanıt süresi 2 gün önce doldu
    });
    expect(r.sinyaller.some((s) => s.tip === "gecikmis_tebligat_yaniti")).toBe(true);
    expect(r.skor).toBeGreaterThan(0);
  });

  it("sıradan (karşıt olmayan) yaklaşan tebligat genel 'yaklasan_vade' havuzuna eklenir", () => {
    const r = hesaplaMusteriRisk({
      ...bosInput,
      musteri: musteri("E"),
      tebligatlar: [tebligat("E", 1, false)],
    });
    expect(r.sinyaller.some((s) => s.tip === "yaklasan_vade")).toBe(true);
    expect(r.sinyaller.some((s) => s.tip === "karsit_inceleme")).toBe(false);
  });
});
