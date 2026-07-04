import { describe, expect, it } from "vitest";
import { riskSnapshotOlustur, riskTrendi, riskTrendOzetleri } from "@/lib/domain/riskGecmis";
import type { RiskGecmisKaydi } from "@/lib/types";
import type { HesaplanmisRisk } from "@/lib/domain/risk";

function gecmis(over: Partial<RiskGecmisKaydi>): RiskGecmisKaydi {
  return {
    id: "g1",
    ofisId: "o1",
    musteriId: "m1",
    skor: 50,
    seviye: "orta",
    tarih: "2026-06-01T00:00:00Z",
    ...over,
  };
}

describe("riskSnapshotOlustur", () => {
  it("HesaplanmisRisk listesinden snapshot üretir", () => {
    const riskler = [
      {
        musteri: { id: "m1", firmaAdi: "Firma A" },
        skor: 70,
        seviye: "yuksek",
        sinyaller: [{ label: "Gecikmiş beyanname" }, { label: "İşlenmemiş tebligat" }],
      },
    ] as unknown as HesaplanmisRisk[];
    const snap = riskSnapshotOlustur(riskler, "o1", "2026-06-20T00:00:00Z");
    expect(snap).toHaveLength(1);
    expect(snap[0].musteriId).toBe("m1");
    expect(snap[0].musteriAdi).toBe("Firma A");
    expect(snap[0].skor).toBe(70);
    expect(snap[0].sinyaller).toEqual(["Gecikmiş beyanname", "İşlenmemiş tebligat"]);
    expect(snap[0].ofisId).toBe("o1");
  });
});

describe("riskTrendi", () => {
  it("boş geçmiş 'yeni'", () => {
    expect(riskTrendi([])).toBe("yeni");
  });

  it("tek kayıt 'yeni'", () => {
    expect(riskTrendi([gecmis({})])).toBe("yeni");
  });

  it("skor artışı 'artiyor'", () => {
    expect(
      riskTrendi([
        gecmis({ skor: 70, tarih: "2026-06-10T00:00:00Z" }),
        gecmis({ skor: 50, tarih: "2026-06-01T00:00:00Z" }),
      ])
    ).toBe("artiyor");
  });

  it("skor düşüşü 'azaliyor'", () => {
    expect(
      riskTrendi([
        gecmis({ skor: 40, tarih: "2026-06-10T00:00:00Z" }),
        gecmis({ skor: 60, tarih: "2026-06-01T00:00:00Z" }),
      ])
    ).toBe("azaliyor");
  });

  it("küçük değişim 'sabit'", () => {
    expect(
      riskTrendi([
        gecmis({ skor: 52, tarih: "2026-06-10T00:00:00Z" }),
        gecmis({ skor: 50, tarih: "2026-06-01T00:00:00Z" }),
      ])
    ).toBe("sabit");
  });
});

describe("riskTrendOzetleri", () => {
  it("müşteri bazında güncel skor + değişim, skora göre sıralı", () => {
    const kayitlar = [
      gecmis({ musteriId: "m1", skor: 80, tarih: "2026-06-10T00:00:00Z" }),
      gecmis({ musteriId: "m1", skor: 60, tarih: "2026-06-01T00:00:00Z" }),
      gecmis({ musteriId: "m2", skor: 90, tarih: "2026-06-10T00:00:00Z" }),
    ];
    const ozet = riskTrendOzetleri(kayitlar);
    expect(ozet[0].musteriId).toBe("m2"); // 90 > 80
    const m1 = ozet.find((o) => o.musteriId === "m1")!;
    expect(m1.guncelSkor).toBe(80);
    expect(m1.oncekiSkor).toBe(60);
    expect(m1.degisim).toBe(20);
    expect(m1.trend).toBe("artiyor");
  });
});
