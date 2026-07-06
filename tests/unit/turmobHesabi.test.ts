import { describe, expect, it } from "vitest";
import { hesaplaTurmobTutarlari } from "@/lib/domain/tahakkuk";

describe("hesaplaTurmobTutarlari", () => {
  it("KDV %20 ve stopaj %20 iken brüt 1200 için net=1000, KDV=200, stopaj=200, tahsil=1000", () => {
    const hesap = hesaplaTurmobTutarlari({ brut: 1200, kdvOrani: 20, stopajUygula: true, stopajOrani: 20 });
    expect(hesap).not.toBeNull();
    expect(hesap!.net).toBeCloseTo(1000, 2);
    expect(hesap!.kdv).toBeCloseTo(200, 2);
    expect(hesap!.stopaj).toBeCloseTo(200, 2);
    expect(hesap!.tahsil).toBeCloseTo(1000, 2);
  });

  it("stopaj matrah (KDV hariç net) üzerinden hesaplanır, KDV üzerinden değil", () => {
    // brüt 12.000, KDV %20 → net 10.000, KDV 2.000. Stopaj %20 → 2.000 (matrahın %20'si), KDV'nin değil.
    const hesap = hesaplaTurmobTutarlari({ brut: 12000, kdvOrani: 20, stopajUygula: true, stopajOrani: 20 });
    expect(hesap!.stopaj).toBeCloseTo(2000, 2);
    expect(hesap!.tahsil).toBeCloseTo(10000, 2);
  });

  it("stopaj uygulanmıyorsa tahsil edilecek brüte eşittir", () => {
    const hesap = hesaplaTurmobTutarlari({ brut: 1200, kdvOrani: 20, stopajUygula: false, stopajOrani: 20 });
    expect(hesap!.stopaj).toBe(0);
    expect(hesap!.tahsil).toBeCloseTo(1200, 2);
  });

  it("KDV %0 (istisna) iken net brüte eşittir", () => {
    const hesap = hesaplaTurmobTutarlari({ brut: 1000, kdvOrani: 0, stopajUygula: true, stopajOrani: 20 });
    expect(hesap!.net).toBeCloseTo(1000, 2);
    expect(hesap!.kdv).toBeCloseTo(0, 2);
    expect(hesap!.stopaj).toBeCloseTo(200, 2);
    expect(hesap!.tahsil).toBeCloseTo(800, 2);
  });

  it("brüt tutar 0 veya negatifse null döner", () => {
    expect(hesaplaTurmobTutarlari({ brut: 0, kdvOrani: 20, stopajUygula: true, stopajOrani: 20 })).toBeNull();
    expect(hesaplaTurmobTutarlari({ brut: -100, kdvOrani: 20, stopajUygula: true, stopajOrani: 20 })).toBeNull();
  });
});
