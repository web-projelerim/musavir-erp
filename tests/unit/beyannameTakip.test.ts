import { describe, expect, it } from "vitest";
import {
  beyannameGecikti,
  beyannameTakipDurumu,
  beyannameTakipOzeti,
  beyannameYaklasan,
  kalanGun,
} from "@/lib/domain/beyannameTakip";
import type { Beyanname } from "@/lib/types";

const REF = new Date("2026-06-20T10:00:00Z");

function b(over: Partial<Pick<Beyanname, "durum" | "sonTarih">>): Pick<Beyanname, "durum" | "sonTarih"> {
  return { durum: "bekliyor", sonTarih: "2026-06-26", ...over };
}

describe("kalanGun", () => {
  it("gelecek tarih için pozitif, geçmiş için negatif", () => {
    expect(kalanGun("2026-06-26", REF)).toBe(6);
    expect(kalanGun("2026-06-15", REF)).toBe(-5);
    expect(kalanGun("2026-06-20", REF)).toBe(0);
  });

  it("geçersiz tarih null döner", () => {
    expect(kalanGun("gecersiz", REF)).toBeNull();
  });
});

describe("beyannameTakipDurumu", () => {
  it("verildi durumu son tarih geçmiş olsa da 'verildi' (gecikmiş sayılmaz)", () => {
    expect(beyannameTakipDurumu(b({ durum: "verildi", sonTarih: "2026-01-01" }), REF)).toBe("verildi");
  });

  it("iptal → iptal", () => {
    expect(beyannameTakipDurumu(b({ durum: "iptal", sonTarih: "2026-01-01" }), REF)).toBe("iptal");
  });

  it("bekliyor + son tarih geçmiş → gecikti", () => {
    expect(beyannameTakipDurumu(b({ durum: "bekliyor", sonTarih: "2026-06-10" }), REF)).toBe("gecikti");
  });

  it("bekliyor + 7 gün içinde → yaklasan", () => {
    expect(beyannameTakipDurumu(b({ sonTarih: "2026-06-26" }), REF)).toBe("yaklasan");
    expect(beyannameTakipDurumu(b({ sonTarih: "2026-06-27" }), REF)).toBe("yaklasan"); // tam 7 gün
  });

  it("bekliyor + uzak tarih → normal", () => {
    expect(beyannameTakipDurumu(b({ sonTarih: "2026-07-15" }), REF)).toBe("normal");
  });

  it("özel eşik ile yaklaşan penceresi değişir", () => {
    expect(beyannameTakipDurumu(b({ sonTarih: "2026-06-28" }), REF, 3)).toBe("normal");
    expect(beyannameTakipDurumu(b({ sonTarih: "2026-06-22" }), REF, 3)).toBe("yaklasan");
  });
});

describe("beyannameGecikti / beyannameYaklasan", () => {
  it("verilmiş beyanname ne geciken ne yaklaşandır", () => {
    const verilmis = b({ durum: "verildi", sonTarih: "2026-06-10" });
    expect(beyannameGecikti(verilmis, REF)).toBe(false);
    expect(beyannameYaklasan(verilmis, REF)).toBe(false);
  });
});

describe("beyannameTakipOzeti", () => {
  it("geciken/yaklaşan/bekleyen sayar; verilmiş ve iptal hariç", () => {
    const liste = [
      b({ durum: "bekliyor", sonTarih: "2026-06-10" }), // gecikti
      b({ durum: "bekliyor", sonTarih: "2026-06-24" }), // yaklasan
      b({ durum: "bekliyor", sonTarih: "2026-07-30" }), // normal
      b({ durum: "verildi", sonTarih: "2026-06-05" }),  // hariç
      b({ durum: "iptal", sonTarih: "2026-06-05" }),    // hariç
    ];
    const ozet = beyannameTakipOzeti(liste, REF);
    expect(ozet.gecikenSayisi).toBe(1);
    expect(ozet.yaklasanSayisi).toBe(1);
    expect(ozet.bekleyenSayisi).toBe(1);
    expect(ozet.aksiyonGerektiren).toBe(2);
  });
});
