import { describe, expect, it } from "vitest";
import { onayBekliyorMu, onayGuncelle, tumVersiyonlar, yeniVersiyonEkle } from "@/lib/domain/belge";
import type { Belge } from "@/lib/types";

function belge(over: Partial<Belge> = {}): Belge {
  return {
    id: "b1",
    musteriId: "m1",
    musteriAdi: "Firma A",
    dosyaAdi: "sozlesme.pdf",
    dosyaTipi: "application/pdf",
    boyut: 1000,
    url: "https://x/v1.pdf",
    storagePath: "belgeler/m1/v1.pdf",
    kategori: "sozlesme",
    gorunurluk: "musavir",
    yukleyen: "user1",
    yukleyenRol: "musavir",
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("yeniVersiyonEkle", () => {
  it("ilk versiyonlamada aktif içerik v1 olarak geçmişe alınır, aktif v2 olur", () => {
    const patch = yeniVersiyonEkle(belge(), {
      url: "https://x/v2.pdf",
      storagePath: "belgeler/m1/v2.pdf",
      boyut: 2000,
      yukleyen: "user2",
    });
    expect(patch.versiyon).toBe(2);
    expect(patch.url).toBe("https://x/v2.pdf");
    expect(patch.boyut).toBe(2000);
    expect(patch.versiyonlar).toHaveLength(1);
    expect(patch.versiyonlar![0].versiyon).toBe(1);
    expect(patch.versiyonlar![0].url).toBe("https://x/v1.pdf");
  });

  it("üçüncü versiyon geçmişe eklenir", () => {
    const v2 = belge({
      url: "https://x/v2.pdf",
      versiyon: 2,
      versiyonlar: [{ versiyon: 1, url: "https://x/v1.pdf", boyut: 1000, yukleyen: "u1", createdAt: "2026-01-01T00:00:00Z" }],
    });
    const patch = yeniVersiyonEkle(v2, { url: "https://x/v3.pdf", boyut: 3000, yukleyen: "u3" });
    expect(patch.versiyon).toBe(3);
    expect(patch.versiyonlar).toHaveLength(2);
    expect(patch.versiyonlar!.map((v) => v.versiyon)).toEqual([1, 2]);
  });
});

describe("tumVersiyonlar", () => {
  it("aktif + geçmiş, en yeni başta", () => {
    const b = belge({
      versiyon: 3,
      url: "https://x/v3.pdf",
      versiyonlar: [
        { versiyon: 1, url: "https://x/v1.pdf", boyut: 1000, yukleyen: "u1", createdAt: "2026-01-01T00:00:00Z" },
        { versiyon: 2, url: "https://x/v2.pdf", boyut: 2000, yukleyen: "u2", createdAt: "2026-02-01T00:00:00Z" },
      ],
    });
    const hepsi = tumVersiyonlar(b);
    expect(hepsi.map((v) => v.versiyon)).toEqual([3, 2, 1]);
  });

  it("versiyonsuz belge tek v1 döner", () => {
    expect(tumVersiyonlar(belge())).toHaveLength(1);
    expect(tumVersiyonlar(belge())[0].versiyon).toBe(1);
  });
});

describe("onay akışı", () => {
  it("onayBekliyorMu bekliyor durumunu tanır", () => {
    expect(onayBekliyorMu(belge({ onayDurum: "bekliyor" }))).toBe(true);
    expect(onayBekliyorMu(belge({ onayDurum: "onaylandi" }))).toBe(false);
    expect(onayBekliyorMu(belge())).toBe(false);
  });

  it("onaylama patch'i doğru alanları set eder", () => {
    const p = onayGuncelle(true, "musavir1", "Uygun");
    expect(p.onayDurum).toBe("onaylandi");
    expect(p.onaylayan).toBe("musavir1");
    expect(p.onayNotu).toBe("Uygun");
    expect(p.onayTarihi).toBeTruthy();
  });

  it("reddetme patch'i", () => {
    const p = onayGuncelle(false, "musavir1");
    expect(p.onayDurum).toBe("reddedildi");
    expect(p.onayNotu).toBeUndefined();
  });
});
