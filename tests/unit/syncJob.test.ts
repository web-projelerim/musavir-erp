import { describe, expect, it } from "vitest";
import {
  basarisizGuncelle,
  calismayaHazir,
  idempotencyKey,
  sonrakiDenemeZamani,
  yeniSyncJob,
} from "@/lib/domain/syncJob";

const REF = new Date("2026-06-20T10:00:00Z");

describe("idempotencyKey", () => {
  it("kapsamlı ve kapsamsız anahtar üretir", () => {
    expect(idempotencyKey("gib_sync", "o1", "2026-06")).toBe("gib_sync:o1:2026-06");
    expect(idempotencyKey("gib_sync", "o1")).toBe("gib_sync:o1");
  });
});

describe("yeniSyncJob", () => {
  it("kuyrukta durumunda, idempotency anahtarıyla başlar", () => {
    const j = yeniSyncJob("rapor_uret", "o1", "u1", { kapsam: "m1", payload: { musteriId: "m1" } });
    expect(j.durum).toBe("kuyrukta");
    expect(j.idempotencyKey).toBe("rapor_uret:o1:m1");
    expect(j.deneme).toBe(0);
    expect(j.maxDeneme).toBe(3);
    expect(j.payload).toEqual({ musteriId: "m1" });
  });
});

describe("sonrakiDenemeZamani (üstel backoff)", () => {
  it("deneme 1 → +1dk, 2 → +2dk, 3 → +4dk", () => {
    expect(sonrakiDenemeZamani(1, REF)).toBe(new Date(REF.getTime() + 60_000).toISOString());
    expect(sonrakiDenemeZamani(2, REF)).toBe(new Date(REF.getTime() + 120_000).toISOString());
    expect(sonrakiDenemeZamani(3, REF)).toBe(new Date(REF.getTime() + 240_000).toISOString());
  });
});

describe("basarisizGuncelle", () => {
  it("maxDeneme'ye ulaşmadan yeniden kuyruğa alır (backoff'lu)", () => {
    const r = basarisizGuncelle({ deneme: 0, maxDeneme: 3 }, "timeout", REF);
    expect(r.durum).toBe("kuyrukta");
    expect(r.deneme).toBe(1);
    expect(r.sonHata).toBe("timeout");
    expect(r.sonrakiDeneme).toBeTruthy();
    expect(r.bitisTarihi).toBeUndefined();
  });

  it("maxDeneme'ye ulaşınca kalıcı başarısız", () => {
    const r = basarisizGuncelle({ deneme: 2, maxDeneme: 3 }, "kalıcı hata", REF);
    expect(r.durum).toBe("basarisiz");
    expect(r.deneme).toBe(3);
    expect(r.bitisTarihi).toBeTruthy();
    expect(r.sonrakiDeneme).toBeUndefined();
  });
});

describe("calismayaHazir", () => {
  it("kuyrukta + backoff yok → hazır", () => {
    expect(calismayaHazir({ durum: "kuyrukta" }, REF)).toBe(true);
  });

  it("kuyrukta ama backoff süresi dolmamış → hazır değil", () => {
    const gelecek = new Date(REF.getTime() + 60_000).toISOString();
    expect(calismayaHazir({ durum: "kuyrukta", sonrakiDeneme: gelecek }, REF)).toBe(false);
  });

  it("backoff süresi dolmuş → hazır", () => {
    const gecmis = new Date(REF.getTime() - 60_000).toISOString();
    expect(calismayaHazir({ durum: "kuyrukta", sonrakiDeneme: gecmis }, REF)).toBe(true);
  });

  it("çalışıyor/tamamlandı durumu hazır değil", () => {
    expect(calismayaHazir({ durum: "calisiyor" }, REF)).toBe(false);
    expect(calismayaHazir({ durum: "tamamlandi" }, REF)).toBe(false);
  });
});
